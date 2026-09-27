import { useEffect, useMemo, useRef, useState } from 'react'
import { RagApiError, fetchProgramSource, proposeChange, proposeChangeStream } from '../api/ragClient'
import { CodeBlock } from './CodeBlock'
import { DiffPanel } from './DiffPanel'
import { buildDiffSegments } from '../utils/diffHunks'
import type { ProgramSource, ResponseMode } from '../types'
import type { ViewMode } from '../hooks/useViewMode'

interface CodeCompareModalProps {
  isOpen: boolean
  programId: string | null
  programLabel: string
  question?: string
  answer?: string
  mode: ResponseMode
  viewMode: ViewMode
  onClose: () => void
}

type DiffSegments = ReturnType<typeof buildDiffSegments>

/** Defensively strips a stray ``` fence the model might wrap the output in,
 * despite being told not to — mirrors the same cleanup CodeChangeService
 * applies server-side. Must NOT trim real content: COBOL is column-sensitive
 * (a section header must start in a specific column), and the backend already
 * guarantees no fence wrapper and preserved indentation — an outer `.trim()`
 * here would silently strip line 1's real leading whitespace, corrupting the
 * file and producing a bogus one-line diff against the unmodified original. */
function stripCodeFences(text: string): string {
  if (!text.startsWith('```')) return text
  const firstNewline = text.indexOf('\n')
  let body = firstNewline !== -1 ? text.slice(firstNewline + 1) : text
  if (body.endsWith('```')) {
    body = body.slice(0, -3)
    if (body.endsWith('\n')) body = body.slice(0, -1)
  } else {
    const lastFence = body.lastIndexOf('\n```')
    if (lastFence !== -1) body = body.slice(0, lastFence)
  }
  return body
}

const GENERIC_PROPOSE_ERROR = "Couldn't generate a proposed change."

function Shimmer({ label }: { label: string }) {
  return (
    <span className="status-shimmer">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{label}</span>
    </span>
  )
}

/** The agent's locate/generate/splice narration — see CodeChangeService's Javadoc
 * for what actually produces each line. Shown live as steps arrive (Live mode) or
 * all at once alongside the result (Full mode), and kept visible after success or
 * failure so the user can see how the agent got there, not just the outcome. */
function ThinkingLog({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null
  return (
    <ul className="code-compare-thinking">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ul>
  )
}

interface TechnicalPanelsProps {
  source: ProgramSource | null
  sourceLoading: boolean
  sourceError: boolean
  diff: DiffSegments | null
  proposedSource: string | null
  proposing: boolean
  proposeError: string | null
  thinkingSteps: string[]
  downloadBase: string
  onGenerate: () => void
}

/** The Current/Proposed side-by-side technical diff — exactly what Tech view
 * always showed. Business view reuses this unchanged as its opt-in "show
 * technical code changes" panel, so there's exactly one implementation of the
 * diff rendering regardless of which view opened it. */
function TechnicalPanels({
  source,
  sourceLoading,
  sourceError,
  diff,
  proposedSource,
  proposing,
  proposeError,
  thinkingSteps,
  downloadBase,
  onGenerate,
}: TechnicalPanelsProps) {
  return (
    <>
      <div className="code-compare-panel">
        <div className="code-compare-panel__header">
          <span>Current</span>
        </div>
        <div className="code-compare-panel__body">
          {sourceLoading && <Shimmer label="Loading source…" />}
          {sourceError && <p className="code-compare-empty">Source not available for this file.</p>}
          {!sourceLoading && !sourceError && source && (
            diff ? (
              <DiffPanel
                segments={diff.left}
                fullText={source.content}
                downloadName={`${downloadBase}-current.cbl`}
                resetKey={proposedSource ?? ''}
              />
            ) : (
              <CodeBlock
                code={source.content}
                language="cobol"
                startLine={1}
                downloadName={`${downloadBase}-current.cbl`}
                collapsible={false}
              />
            )
          )}
        </div>
      </div>

      <div className="code-compare-panel">
        <div className="code-compare-panel__header">
          <span>Proposed</span>
        </div>
        <div className="code-compare-panel__body">
          {diff ? (
            <>
              <ThinkingLog steps={thinkingSteps} />
              <DiffPanel
                segments={diff.right}
                fullText={proposedSource ?? ''}
                downloadName={`${downloadBase}-proposed.cbl`}
                resetKey={proposedSource ?? ''}
              />
            </>
          ) : proposing ? (
            <div className="code-compare-idle code-compare-idle--thinking">
              <ThinkingLog steps={thinkingSteps} />
              <Shimmer label={thinkingSteps.length > 0 ? thinkingSteps[thinkingSteps.length - 1] : 'Generating proposed change…'} />
            </div>
          ) : proposeError ? (
            <div className="code-compare-idle">
              <ThinkingLog steps={thinkingSteps} />
              <p>{proposeError}</p>
              <button type="button" className="code-compare-generate-btn" onClick={onGenerate} disabled={!source}>
                Try again
              </button>
            </div>
          ) : (
            <div className="code-compare-idle">
              <p>See how this file might change to implement the recommendation.</p>
              <button type="button" className="code-compare-generate-btn" onClick={onGenerate} disabled={!source}>
                Generate proposed change
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function CodeCompareModal({
  isOpen,
  programId,
  programLabel,
  question,
  answer,
  mode,
  viewMode,
  onClose,
}: CodeCompareModalProps) {
  const [source, setSource] = useState<ProgramSource | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState(false)

  const [proposedSource, setProposedSource] = useState<string | null>(null)
  // Plain-English translation of the diff, from CodeChangeService's
  // generateBusinessSummary — non-null only on a successful generation where
  // one could be produced. Business view leads with this instead of the raw
  // diff; Tech view never reads it.
  const [businessSummary, setBusinessSummary] = useState<string | null>(null)
  // Business view's opt-in reveal of the same technical diff Tech view always
  // shows — starts collapsed so the plain-language summary is what a
  // non-technical reviewer sees first.
  const [showTechnicalDiff, setShowTechnicalDiff] = useState(false)
  const [proposing, setProposing] = useState(false)
  // The agent's "thinking" narration, in order — locate/generate/splice steps for a
  // large file, or a single fast-path note for a small one. Populated live as events
  // arrive in Live mode, or all at once alongside the result/error in Full mode.
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([])
  // The specific reason generation failed (e.g. "Couldn't confidently identify which
  // section…"), not just a boolean — so the user sees why, not just that. null means
  // no error; a non-null string (including '') means show it.
  const [proposeError, setProposeError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isBusinessView = viewMode === 'business'

  useEffect(() => {
    if (!isOpen || !programId) return
    setSource(null)
    setSourceError(false)
    setProposedSource(null)
    setBusinessSummary(null)
    setShowTechnicalDiff(false)
    setThinkingSteps([])
    setProposeError(null)
    setSourceLoading(true)
    // Defensive, alongside the abort below: aborting a fetch/stream rejects
    // its promise on the next microtask, not synchronously, so without this
    // there's a brief window — between this effect's synchronous body
    // running and that rejection reaching handleGenerate's `finally` — where
    // `proposing` would still read true from whatever program was
    // previously open, flashing "Generating…" for a program that never
    // asked for it.
    setProposing(false)

    const controller = new AbortController()
    fetchProgramSource(programId, controller.signal)
      .then((res) => setSource(res))
      .catch(() => setSourceError(true))
      .finally(() => setSourceLoading(false))

    // This modal never unmounts (see the always-rendered JSX below — it's
    // shown/hidden purely via the `is-open` CSS class), so the OTHER cleanup
    // effect below (empty deps, unmount-only) never fires when the user
    // simply closes this modal or switches to a different impacted node —
    // only when the whole component instance is torn down, which in
    // practice is never. Without aborting HERE too, a still-streaming
    // handleGenerate() call for the PREVIOUS program keeps running in the
    // background and its setProposing/setProposedSource calls land on
    // whichever program is now being viewed — showing another program's
    // (still-generating or already-finished) proposed change, diffed
    // against the wrong "current" source. Aborting on every isOpen/programId
    // change — not just on unmount — closes that gap.
    return () => {
      controller.abort()
      abortRef.current?.abort()
    }
  }, [isOpen, programId])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const handleGenerate = async () => {
    if (!programId) return
    setProposing(true)
    setProposeError(null)
    setProposedSource(null)
    setBusinessSummary(null)
    setShowTechnicalDiff(false)
    setThinkingSteps([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (mode === 'stream') {
        let result: string | null = null
        let summary: string | null = null
        let errorMessage: string | null = null
        await proposeChangeStream(
          programId,
          question ?? '',
          answer ?? '',
          {
            onThinking: (message) => {
              setThinkingSteps((prev) => [...prev, message])
            },
            onResult: (proposedSource, businessSummary) => {
              result = proposedSource
              summary = businessSummary
            },
            onError: (message) => {
              errorMessage = message || GENERIC_PROPOSE_ERROR
            },
          },
          controller.signal,
        )
        if (errorMessage || !result) {
          setProposeError(errorMessage ?? GENERIC_PROPOSE_ERROR)
        } else {
          setProposedSource(stripCodeFences(result))
          setBusinessSummary(summary)
        }
      } else {
        const { proposedSource, steps, businessSummary } =
          await proposeChange(programId, question ?? '', answer ?? '', controller.signal)
        setThinkingSteps(steps)
        setProposedSource(stripCodeFences(proposedSource))
        setBusinessSummary(businessSummary)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const apiErr = err instanceof RagApiError ? err : null
        setProposeError((err as Error).message || GENERIC_PROPOSE_ERROR)
        if (apiErr?.steps) setThinkingSteps(apiErr.steps)
      }
    } finally {
      setProposing(false)
    }
  }

  const diff = useMemo(
    () => (source && proposedSource ? buildDiffSegments(source.content, proposedSource) : null),
    [source, proposedSource],
  )
  const downloadBase = programId ?? 'program'
  // In Business view, the summary leads and the diff is opt-in; if no summary
  // could be generated, auto-reveal the diff instead so a business reviewer
  // still gets something rather than nothing.
  const revealTechnicalDiff = showTechnicalDiff || (!!diff && !businessSummary)

  const technicalPanelsProps: TechnicalPanelsProps = {
    source,
    sourceLoading,
    sourceError,
    diff,
    proposedSource,
    proposing,
    proposeError,
    thinkingSteps,
    downloadBase,
    onGenerate: handleGenerate,
  }

  return (
    <>
      <div className={`code-compare-backdrop${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div className={`code-compare-modal${isOpen ? ' is-open' : ''}`} role="dialog" aria-label="Compare code change">
        <div className="code-compare-modal__header">
          <span className="code-compare-modal__title">{programLabel}</span>
          <button
            type="button"
            className="code-compare-modal__close"
            onClick={onClose}
            aria-label="Close compare view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {isBusinessView ? (
          <div className="code-compare-modal__body code-compare-modal__body--business">
            {!diff ? (
              <div className="code-compare-idle">
                {sourceLoading ? (
                  <Shimmer label="Loading source…" />
                ) : sourceError ? (
                  <p className="code-compare-empty">Source not available for this file.</p>
                ) : proposing ? (
                  <>
                    <ThinkingLog steps={thinkingSteps} />
                    <Shimmer label={thinkingSteps.length > 0 ? thinkingSteps[thinkingSteps.length - 1] : 'Generating proposed change…'} />
                  </>
                ) : proposeError ? (
                  <>
                    <ThinkingLog steps={thinkingSteps} />
                    <p>{proposeError}</p>
                    <button type="button" className="code-compare-generate-btn" onClick={handleGenerate} disabled={!source}>
                      Try again
                    </button>
                  </>
                ) : (
                  <>
                    <p>See what this change would actually do to {programLabel}, described in plain language.</p>
                    <button type="button" className="code-compare-generate-btn" onClick={handleGenerate} disabled={!source}>
                      Generate proposed change
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {businessSummary ? (
                  <div className="business-impact-summary">
                    <span className="business-impact-summary__label">What this change does</span>
                    <p>{businessSummary}</p>
                  </div>
                ) : (
                  <p className="impact-legend">
                    A plain-language summary wasn&rsquo;t available for this change — showing the technical view instead.
                  </p>
                )}

                {businessSummary && (
                  <button
                    type="button"
                    className="code-compare-toggle-technical"
                    onClick={() => setShowTechnicalDiff((v) => !v)}
                  >
                    {revealTechnicalDiff ? 'Hide technical code changes' : 'Show technical code changes'}
                  </button>
                )}

                {revealTechnicalDiff && (
                  <div className="code-compare-modal__body code-compare-modal__body--nested">
                    <TechnicalPanels {...technicalPanelsProps} />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="code-compare-modal__body">
            <TechnicalPanels {...technicalPanelsProps} />
          </div>
        )}
      </div>
    </>
  )
}

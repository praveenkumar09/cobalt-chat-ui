import { useEffect, useRef, useState } from 'react'
import { diffLines } from 'diff'
import { fetchProgramSource, proposeChange, proposeChangeStream } from '../api/ragClient'
import { CodeBlock, type DiffLineKind } from './CodeBlock'
import type { ProgramSource, ResponseMode } from '../types'

interface CodeCompareModalProps {
  isOpen: boolean
  programId: string | null
  programLabel: string
  question?: string
  answer?: string
  mode: ResponseMode
  onClose: () => void
}

/** Splits a line-level diff into two independently-scrollable columns: the
 * original file (unchanged + removed lines) and the proposed file (unchanged
 * + added lines) — a classic side-by-side compare, not a strictly-aligned grid. */
function splitDiff(current: string, proposed: string): { left: DiffLineKind[]; right: DiffLineKind[]; leftText: string; rightText: string } {
  const parts = diffLines(current, proposed)
  const left: DiffLineKind[] = []
  const right: DiffLineKind[] = []
  const leftLines: string[] = []
  const rightLines: string[] = []

  for (const part of parts) {
    const lines = part.value.replace(/\n$/, '').split('\n')
    if (part.added) {
      lines.forEach((text) => {
        right.push('added')
        rightLines.push(text)
      })
    } else if (part.removed) {
      lines.forEach((text) => {
        left.push('removed')
        leftLines.push(text)
      })
    } else {
      lines.forEach((text) => {
        left.push('same')
        leftLines.push(text)
        right.push('same')
        rightLines.push(text)
      })
    }
  }

  return { left, right, leftText: leftLines.join('\n'), rightText: rightLines.join('\n') }
}

/** Defensively strips a stray ``` fence the model might wrap the output in,
 * despite being told not to — mirrors the same cleanup CodeChangeService
 * applies server-side for the non-streaming path. */
function stripCodeFences(text: string): string {
  let trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n')
    if (firstNewline !== -1) trimmed = trimmed.slice(firstNewline + 1)
    const lastFence = trimmed.lastIndexOf('```')
    if (lastFence !== -1) trimmed = trimmed.slice(0, lastFence)
  }
  return trimmed.trim()
}

function Shimmer({ label }: { label: string }) {
  return (
    <span className="status-shimmer">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{label}</span>
    </span>
  )
}

export function CodeCompareModal({
  isOpen,
  programId,
  programLabel,
  question,
  answer,
  mode,
  onClose,
}: CodeCompareModalProps) {
  const [source, setSource] = useState<ProgramSource | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState(false)

  // Partial text while a stream is in flight (Live mode) — swapped for the
  // finalized, diffed version once generation completes.
  const [streamingText, setStreamingText] = useState('')
  const [proposedSource, setProposedSource] = useState<string | null>(null)
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // onToken fires once per streamed chunk (often many per second). Setting
  // state directly there re-renders CodeBlock — and its Prism syntax
  // highlighter re-tokenizes the ENTIRE accumulated text — on every single
  // chunk, growing larger each time. That's what was freezing the tab
  // during generation. Instead, accumulate into a ref and flush to state at
  // most once per animation frame, capping re-renders (and re-highlights)
  // to ~60/sec regardless of how fast chunks arrive.
  const pendingStreamTextRef = useRef('')
  const streamFlushHandleRef = useRef<number | null>(null)

  const flushStreamingText = () => {
    setStreamingText(pendingStreamTextRef.current)
    streamFlushHandleRef.current = null
  }

  const queueStreamingTextUpdate = (text: string) => {
    pendingStreamTextRef.current = text
    if (streamFlushHandleRef.current == null) {
      streamFlushHandleRef.current = window.requestAnimationFrame(flushStreamingText)
    }
  }

  const cancelPendingStreamFlush = () => {
    if (streamFlushHandleRef.current != null) {
      window.cancelAnimationFrame(streamFlushHandleRef.current)
      streamFlushHandleRef.current = null
    }
  }

  useEffect(() => {
    if (!isOpen || !programId) return
    setSource(null)
    setSourceError(false)
    setProposedSource(null)
    setStreamingText('')
    setProposeError(false)
    setSourceLoading(true)

    const controller = new AbortController()
    fetchProgramSource(programId, controller.signal)
      .then((res) => setSource(res))
      .catch(() => setSourceError(true))
      .finally(() => setSourceLoading(false))

    return () => controller.abort()
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
      cancelPendingStreamFlush()
    }
  }, [])

  const handleGenerate = async () => {
    if (!programId) return
    setProposing(true)
    setProposeError(false)
    setProposedSource(null)
    setStreamingText('')
    pendingStreamTextRef.current = ''
    cancelPendingStreamFlush()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (mode === 'stream') {
        let accumulated = ''
        let sawError = false
        await proposeChangeStream(
          programId,
          question ?? '',
          answer ?? '',
          {
            onToken: (content) => {
              accumulated += content
              queueStreamingTextUpdate(accumulated)
            },
            onError: () => {
              sawError = true
            },
          },
          controller.signal,
        )
        cancelPendingStreamFlush()
        if (sawError || !accumulated.trim()) {
          setProposeError(true)
        } else {
          setProposedSource(stripCodeFences(accumulated))
        }
      } else {
        const proposed = await proposeChange(programId, question ?? '', answer ?? '', controller.signal)
        setProposedSource(stripCodeFences(proposed))
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setProposeError(true)
      }
    } finally {
      setProposing(false)
    }
  }

  const diff = source && proposedSource ? splitDiff(source.content, proposedSource) : null
  const downloadBase = programId ?? 'program'

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

        <div className="code-compare-modal__body">
          <div className="code-compare-panel">
            <div className="code-compare-panel__header">
              <span>Current</span>
            </div>
            <div className="code-compare-panel__body">
              {sourceLoading && <Shimmer label="Loading source…" />}
              {sourceError && <p className="code-compare-empty">Source not available for this file.</p>}
              {!sourceLoading && !sourceError && source && (
                <CodeBlock
                  code={diff ? diff.leftText : source.content}
                  language="cobol"
                  startLine={1}
                  downloadName={`${downloadBase}-current.cbl`}
                  collapsible={false}
                  lineKinds={diff?.left}
                />
              )}
            </div>
          </div>

          <div className="code-compare-panel">
            <div className="code-compare-panel__header">
              <span>Proposed</span>
            </div>
            <div className="code-compare-panel__body">
              {diff ? (
                <CodeBlock
                  code={diff.rightText}
                  language="cobol"
                  startLine={1}
                  downloadName={`${downloadBase}-proposed.cbl`}
                  collapsible={false}
                  lineKinds={diff.right}
                />
              ) : proposing && streamingText ? (
                <CodeBlock
                  code={streamingText}
                  language="cobol"
                  startLine={1}
                  downloadName={`${downloadBase}-proposed.cbl`}
                  collapsible={false}
                />
              ) : proposing ? (
                <Shimmer label="Generating proposed change…" />
              ) : proposeError ? (
                <div className="code-compare-idle">
                  <p>Couldn&rsquo;t generate a proposed change.</p>
                  <button type="button" className="code-compare-generate-btn" onClick={handleGenerate} disabled={!source}>
                    Try again
                  </button>
                </div>
              ) : (
                <div className="code-compare-idle">
                  <p>See how this file might change to implement the recommendation.</p>
                  <button
                    type="button"
                    className="code-compare-generate-btn"
                    onClick={handleGenerate}
                    disabled={!source}
                  >
                    Generate proposed change
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

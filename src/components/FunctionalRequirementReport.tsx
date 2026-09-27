import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchFunctionalRequirement } from '../api/ragClient'
import { MarkdownMessage } from './MarkdownMessage'
import type { Message } from '../types'

interface FunctionalRequirementReportProps {
  message: Message
  isOpen: boolean
  onClose: () => void
}

function formatTimestamp(): string {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function Shimmer({ label }: { label: string }) {
  return (
    <span className="status-shimmer">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{label}</span>
    </span>
  )
}

/**
 * "Export Functional Requirement Report" — unlike ChangeImpactReport (deterministic,
 * built purely from fields the message already carries), this one generates fresh
 * content on open: a formal FR document for the specific question asked, grounded in
 * the answer plus whatever business rules/decision table/data dictionary entries were
 * already extracted for it (see BusinessInsightService#generateFunctionalRequirement).
 * Available for every business-mode answer — see MessageBubble's showFunctionalRequirement
 * (no scenario-walkthrough gating, unlike the Change Impact Report).
 */
export function FunctionalRequirementReport({ message, isOpen, onClose }: FunctionalRequirementReportProps) {
  const [requirement, setRequirement] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // Bumped on every open/retry so a stale request's result can't land after a
  // newer one has already started — same pattern as useChat's streamGenerationRef,
  // just simpler since there's no streaming here to race against.
  const generationRef = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const generate = (controller: AbortController) => {
    const myGeneration = ++generationRef.current
    setLoading(true)
    setError(false)
    fetchFunctionalRequirement(
      message.sourceQuestion ?? '',
      message.content,
      message.businessRules,
      message.decisionTable,
      message.dataDictionary,
      controller.signal,
    )
      .then((text) => {
        if (generationRef.current !== myGeneration) return
        setRequirement(text)
      })
      .catch((err: unknown) => {
        if (generationRef.current !== myGeneration) return
        if ((err as Error).name !== 'AbortError') setError(true)
      })
      .finally(() => {
        if (generationRef.current === myGeneration) setLoading(false)
      })
  }

  // Fresh generation every time the report is opened (not cached on the message) —
  // same tradeoff CodeCompareModal makes for "Generate proposed change": simplest
  // to reason about, and this is an on-demand export action, not something asked
  // for on every turn by default.
  useEffect(() => {
    if (!isOpen) {
      setRequirement(null)
      setError(false)
      return
    }
    const controller = new AbortController()
    generate(controller)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, message.id])

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="report-backdrop is-open" onClick={onClose} aria-hidden="true" />
      <div className="report-modal is-open" role="dialog" aria-label="Functional requirement report">
        <div className="report-modal__header">
          <span className="report-modal__title">Functional Requirement Report</span>
          <div className="report-modal__actions">
            <button
              type="button"
              className="report-modal__print-btn"
              onClick={() => window.print()}
              disabled={loading || error || !requirement}
            >
              Print / Save as PDF
            </button>
            <button type="button" className="report-modal__close" onClick={onClose} aria-label="Close report">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="report-modal__body report-printable">
          <header className="report-doc__header">
            <h1>Functional Requirement Report</h1>
            <p className="report-doc__meta">Generated {formatTimestamp()}</p>
          </header>

          {message.sourceQuestion && (
            <section className="report-doc__section">
              <h2>Request</h2>
              <p className="report-doc__question">{message.sourceQuestion}</p>
            </section>
          )}

          <section className="report-doc__section">
            {loading && <Shimmer label="Generating functional requirement…" />}
            {!loading && error && (
              <div className="code-compare-idle">
                <p>Couldn&rsquo;t generate the functional requirement.</p>
                <button
                  type="button"
                  className="code-compare-generate-btn"
                  onClick={() => {
                    const controller = new AbortController()
                    generate(controller)
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {!loading && !error && requirement && <MarkdownMessage content={requirement} />}
          </section>

          <footer className="report-doc__footer">Generated by Orbit — AS400/COBOL Assistant</footer>
        </div>
      </div>
    </>,
    document.body,
  )
}

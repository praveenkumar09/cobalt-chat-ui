import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchTestScenarios } from '../api/ragClient'
import { MarkdownMessage } from './MarkdownMessage'
import type { Message } from '../types'

interface TestScenarioReportProps {
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
 * "Export Test Scenarios" — a sibling of FunctionalRequirementReport.tsx, same
 * fresh-on-open generation pattern: a QA test-scenario document for the
 * specific question asked, grounded in the answer plus whatever business
 * rules/decision table entries were already extracted for it (see
 * BusinessInsightService#generateTestScenarios). Only shown when there's
 * actually a business rule or decision table row to derive test cases from —
 * see MessageBubble's showTestScenarios.
 */
export function TestScenarioReport({ message, isOpen, onClose }: TestScenarioReportProps) {
  const [scenarios, setScenarios] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // Bumped on every open/retry so a stale request's result can't land after a
  // newer one has already started — same pattern as FunctionalRequirementReport.
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
    fetchTestScenarios(
      message.sourceQuestion ?? '',
      message.content,
      message.businessRules,
      message.decisionTable,
      controller.signal,
    )
      .then((text) => {
        if (generationRef.current !== myGeneration) return
        setScenarios(text)
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
  // same tradeoff FunctionalRequirementReport makes.
  useEffect(() => {
    if (!isOpen) {
      setScenarios(null)
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
      <div className="report-modal is-open" role="dialog" aria-label="Test scenarios report">
        <div className="report-modal__header">
          <span className="report-modal__title">Test Scenarios Report</span>
          <div className="report-modal__actions">
            <button
              type="button"
              className="report-modal__print-btn"
              onClick={() => window.print()}
              disabled={loading || error || !scenarios}
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
            <h1>Test Scenarios Report</h1>
            <p className="report-doc__meta">Generated {formatTimestamp()}</p>
          </header>

          {message.sourceQuestion && (
            <section className="report-doc__section">
              <h2>Request</h2>
              <p className="report-doc__question">{message.sourceQuestion}</p>
            </section>
          )}

          <section className="report-doc__section">
            {loading && <Shimmer label="Generating test scenarios…" />}
            {!loading && error && (
              <div className="code-compare-idle">
                <p>Couldn&rsquo;t generate test scenarios.</p>
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
            {!loading && !error && scenarios && <MarkdownMessage content={scenarios} />}
          </section>

          <footer className="report-doc__footer">Generated by Orbit — AS400/COBOL Assistant</footer>
        </div>
      </div>
    </>,
    document.body,
  )
}

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MarkdownMessage } from './MarkdownMessage'
import type { ImpactAnalysis, Message } from '../types'

interface ChangeImpactReportProps {
  message: Message
  isOpen: boolean
  onClose: () => void
}

type ImpactScope = 'Low' | 'Medium' | 'High'

// Deterministic, no LLM call: derived purely from the shape of the already-computed
// impact graph, so opening the report costs nothing beyond what the chat answer
// already paid for. Labeled "estimated impact scope" (not a fake effort/day count)
// to stay honest with business stakeholders about what this actually measures.
function estimateImpactScope(analysis: ImpactAnalysis | null | undefined): ImpactScope | null {
  if (!analysis || analysis.tiers.length === 0) return null
  const totalNodes = analysis.tiers.reduce((sum, t) => sum + t.nodes.length, 0)
  const tiersBeyondRoot = analysis.tiers.length - 1
  if (totalNodes <= 5 && tiersBeyondRoot <= 1) return 'Low'
  if (totalNodes <= 15 && tiersBeyondRoot <= 2) return 'Medium'
  return 'High'
}

const TIER_LABELS = ['Directly affected', 'Also touches', 'Downstream impact']

function tierLabel(order: number): string {
  return TIER_LABELS[order] ?? `Tier ${order + 1}`
}

function formatTimestamp(): string {
  return new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ChangeImpactReport({ message, isOpen, onClose }: ChangeImpactReportProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const scope = estimateImpactScope(message.impactAnalysis)
  const rules = message.businessRules ?? []
  const decisionRows = message.decisionTable ?? []
  const dictionary = message.dataDictionary ?? []
  const tiers = message.impactAnalysis?.tiers ?? []

  // Portaled to document.body — this component is otherwise mounted deep inside
  // .chat-body, which scrolls via `overflow-y: auto`. On screen that's invisible
  // because the modal is `position: fixed` (fixed always escapes an ancestor's
  // overflow clipping). But the print stylesheet needs to switch it to a normal,
  // unclipped flow element so multi-page content isn't cut off — and a
  // non-portaled `position: static` would then get clipped right back down to
  // .chat-body's on-screen height, which is exactly the "PDF is missing content"
  // bug this fixes. Portaling to <body> removes that scrolling ancestor entirely.
  return createPortal(
    <>
      <div className="report-backdrop is-open" onClick={onClose} aria-hidden="true" />
      <div className="report-modal is-open" role="dialog" aria-label="Change impact report">
        <div className="report-modal__header">
          <span className="report-modal__title">Change Impact Report</span>
          <div className="report-modal__actions">
            <button type="button" className="report-modal__print-btn" onClick={() => window.print()}>
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
            <h1>Change Impact Report</h1>
            <p className="report-doc__meta">Generated {formatTimestamp()}</p>
          </header>

          {message.sourceQuestion && (
            <section className="report-doc__section">
              <h2>Request</h2>
              <p className="report-doc__question">{message.sourceQuestion}</p>
            </section>
          )}

          <section className="report-doc__section">
            <h2>Summary</h2>
            <MarkdownMessage content={message.content} />
          </section>

          {scope && (
            <section className="report-doc__section">
              <h2>Estimated impact scope</h2>
              <span className={`report-scope-badge report-scope-badge--${scope.toLowerCase()}`}>{scope}</span>
            </section>
          )}

          {rules.length > 0 && (
            <section className="report-doc__section">
              <h2>Business rules</h2>
              <ul className="rules-list">
                {rules.map((r, i) => (
                  <li className="rules-list__item" key={i}>
                    <span>{r.rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {decisionRows.length > 0 && (
            <section className="report-doc__section">
              <h2>Decision table</h2>
              <div className="decision-table-frame">
                <table className="decision-table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th>Business Outcome</th>
                      <th>Exception</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisionRows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.condition}</td>
                        <td>{row.outcome}</td>
                        <td className={row.exception ? undefined : 'decision-table__empty'}>
                          {row.exception || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tiers.length > 0 && (
            <section className="report-doc__section">
              <h2>Affected systems</h2>
              {tiers.map((tier) => (
                <div className="report-doc__tier" key={tier.order}>
                  <h3>{tierLabel(tier.order)}</h3>
                  <ul className="report-doc__tier-list">
                    {tier.nodes.map((node) => (
                      <li key={node.id}>
                        {node.label} <span className="report-doc__tier-type">({node.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {dictionary.length > 0 && (
            <section className="report-doc__section">
              <h2>Key data terms</h2>
              <ul className="report-doc__glossary">
                {dictionary.map((d, i) => (
                  <li key={i}>
                    <strong>{d.term}</strong>
                    {d.technicalName && <span className="report-doc__glossary-tech"> ({d.technicalName})</span>}
                    <p>{d.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="report-doc__footer">Generated by Orbit — AS400/COBOL Assistant</footer>
        </div>
      </div>
    </>,
    document.body
  )
}

import { useState } from 'react'
import { BusinessFlowDiagram } from './BusinessFlowDiagram'
import { KeyRelationships } from './KeyRelationships'
import type { BusinessFlow, GraphRelationship } from '../types'
import type { RelationshipView } from '../hooks/useRelationshipView'

interface BusinessFlowSectionProps {
  flow: BusinessFlow
  relationshipView: RelationshipView
}

function toGraphRelationships(flow: BusinessFlow): GraphRelationship[] {
  return flow.edges.map((e) => ({
    fromId: e.fromActivity,
    fromLabel: e.fromActivity,
    fromType: 'BUSINESS_ACTIVITY',
    relType: e.relation,
    toId: e.toActivity,
    toLabel: e.toActivity,
    toType: 'BUSINESS_ACTIVITY',
  }))
}

// Collapsed by default, same as every other insight section (Business rules,
// Decision table, Key relationships via CollapsibleSection) — the diagram/list
// content (and the lazy mermaid import it triggers) only mounts once the user
// actually opens it, deferring that cost until it's wanted.
export function BusinessFlowSection({ flow, relationshipView }: BusinessFlowSectionProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'diagram' | 'list'>('diagram')
  const [diagramFailed, setDiagramFailed] = useState(false)

  if (flow.edges.length === 0) return null

  const showDiagram = mode === 'diagram' && !diagramFailed

  return (
    <div className={`rel-section${open ? ' is-open' : ''}`}>
      <button type="button" className="rel-section__header" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <svg
          className="rel-section__chevron"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="rel-section__label">Business flow</span>
        <span className="rel-section__count">{flow.edges.length}</span>
      </button>

      <div className={`rel-section__body-frame${open ? ' is-open' : ''}`}>
        <div className="rel-section__body-inner">
          {open && (
            <div className="business-flow-section__body">
              {!diagramFailed && (
                <div className="flow-view-toggle">
                  <button
                    type="button"
                    className={`flow-view-toggle__btn${mode === 'diagram' ? ' is-active' : ''}`}
                    onClick={() => setMode('diagram')}
                  >
                    Diagram
                  </button>
                  <button
                    type="button"
                    className={`flow-view-toggle__btn${mode === 'list' ? ' is-active' : ''}`}
                    onClick={() => setMode('list')}
                  >
                    List
                  </button>
                </div>
              )}

              {showDiagram ? (
                <BusinessFlowDiagram flow={flow} onRenderError={() => setDiagramFailed(true)} />
              ) : (
                <KeyRelationships
                  relationships={toGraphRelationships(flow)}
                  view={relationshipView}
                  label="Business flow"
                  defaultOpen
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

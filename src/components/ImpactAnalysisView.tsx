import { useState } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { NodePill } from './KeyRelationships'
import { CodeCompareModal } from './CodeCompareModal'
import type { ImpactAnalysis, ResponseMode } from '../types'

interface ImpactAnalysisViewProps {
  analysis: ImpactAnalysis
  question?: string
  answer?: string
  mode: ResponseMode
}

function tierTitle(index: number, hasCycle: boolean): string {
  if (hasCycle) return 'Circular dependency — review together'
  return index === 0 ? 'Change first' : 'Then update'
}

export function ImpactAnalysisView({ analysis, question, answer, mode }: ImpactAnalysisViewProps) {
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null)
  const totalNodes = analysis.tiers.reduce((sum, t) => sum + t.nodes.length, 0)
  if (totalNodes === 0) return null

  return (
    <>
      <CollapsibleSection label="Impact analysis" count={totalNodes}>
        <div className="impact-content">
          {analysis.tiers.map((tier, i) => (
            <div className="impact-tier" key={tier.order} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="impact-tier__marker">
                <span className={`impact-tier__step${tier.hasCycle ? ' is-cycle' : ''}`}>{i + 1}</span>
                {i < analysis.tiers.length - 1 && <span className="impact-tier__connector" aria-hidden="true" />}
              </div>
              <div className="impact-tier__body">
                <span className={`impact-tier__title${tier.hasCycle ? ' is-cycle' : ''}`}>
                  {tierTitle(i, tier.hasCycle)}
                </span>
                <div className="impact-tier__nodes">
                  {tier.nodes.map((n) => (
                    <NodePill
                      key={n.id}
                      label={n.label}
                      type={n.type}
                      onClick={() => setSelected({ id: n.id, label: n.label })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {analysis.truncated && (
            <p className="impact-note">Showing the closest impacted files found — the full set may be larger.</p>
          )}
        </div>
      </CollapsibleSection>

      <CodeCompareModal
        isOpen={selected !== null}
        programId={selected?.id ?? null}
        programLabel={selected?.label ?? ''}
        question={question}
        answer={answer}
        mode={mode}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

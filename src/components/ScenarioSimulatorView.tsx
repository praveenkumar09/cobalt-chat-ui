import { CollapsibleSection } from './CollapsibleSection'
import { ReferenceButton } from './ReferenceButton'
import type { ScenarioTrace } from '../types'

interface ScenarioSimulatorViewProps {
  trace: ScenarioTrace
  onOpenReference: (chunkId: string) => void
}

// Closed by default — CollapsibleSection's own default (defaultOpen omitted
// below) — same as every other insight section. Only ever rendered when the
// backend actually detected a concrete "what if" scenario in a business-mode
// question (see RagService.looksLikeScenarioQuestion), so an empty trace
// never reaches here in practice; the length guard is just the same safety
// net BusinessRulesView/DecisionTableView already use.
export function ScenarioSimulatorView({ trace, onOpenReference }: ScenarioSimulatorViewProps) {
  if (trace.steps.length === 0) return null

  return (
    <CollapsibleSection label="Scenario walkthrough" count={trace.steps.length}>
      <ol className="scenario-steps">
        {trace.steps.map((step, i) => (
          <li className="scenario-steps__item" key={i} style={{ animationDelay: `${i * 55}ms` }}>
            <div className="scenario-steps__number">{i + 1}</div>
            <div className="scenario-steps__body">
              <div className="scenario-steps__condition">{step.condition}</div>
              <div className="scenario-steps__result">{step.result}</div>
              {step.explanation && <div className="scenario-steps__explanation">{step.explanation}</div>}
            </div>
            {step.chunkId && <ReferenceButton onClick={() => onOpenReference(step.chunkId!)} />}
          </li>
        ))}
      </ol>
      {trace.outcome && (
        <div className="scenario-outcome">
          <span className="scenario-outcome__label">Outcome</span>
          <span>{trace.outcome}</span>
        </div>
      )}
    </CollapsibleSection>
  )
}

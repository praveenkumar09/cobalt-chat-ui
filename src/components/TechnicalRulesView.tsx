import { CollapsibleSection } from './CollapsibleSection'
import { ReferenceButton } from './ReferenceButton'
import type { TechnicalRule } from '../types'

interface TechnicalRulesViewProps {
  rules: TechnicalRule[]
  onOpenReference: (chunkId: string) => void
}

export function TechnicalRulesView({ rules, onOpenReference }: TechnicalRulesViewProps) {
  if (rules.length === 0) return null

  return (
    <CollapsibleSection label="Technical rules" count={rules.length}>
      <ul className="rules-list">
        {rules.map((r, i) => (
          <li className="rules-list__item rules-list__item--technical" key={i} style={{ animationDelay: `${i * 55}ms` }}>
            <span>{r.rule}</span>
            {r.chunkId && <ReferenceButton onClick={() => onOpenReference(r.chunkId!)} />}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}

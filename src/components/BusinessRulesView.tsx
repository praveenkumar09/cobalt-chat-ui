import { CollapsibleSection } from './CollapsibleSection'

interface BusinessRulesViewProps {
  rules: string[]
}

export function BusinessRulesView({ rules }: BusinessRulesViewProps) {
  if (rules.length === 0) return null

  return (
    <CollapsibleSection label="Business rules" count={rules.length}>
      <ul className="rules-list">
        {rules.map((rule, i) => (
          <li className="rules-list__item" key={i} style={{ animationDelay: `${i * 55}ms` }}>
            {rule}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}

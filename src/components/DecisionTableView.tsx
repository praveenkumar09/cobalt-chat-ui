import { CollapsibleSection } from './CollapsibleSection'
import type { DecisionTableRow } from '../types'

interface DecisionTableViewProps {
  rows: DecisionTableRow[]
}

export function DecisionTableView({ rows }: DecisionTableViewProps) {
  if (rows.length === 0) return null

  return (
    <CollapsibleSection label="Decision table" count={rows.length}>
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
            {rows.map((row, i) => (
              <tr key={i} style={{ animationDelay: `${i * 55}ms` }}>
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
    </CollapsibleSection>
  )
}

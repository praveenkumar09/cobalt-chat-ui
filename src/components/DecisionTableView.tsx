import { CollapsibleSection } from './CollapsibleSection'
import { ReferenceButton } from './ReferenceButton'
import type { DecisionTableRow } from '../types'

interface DecisionTableViewProps {
  rows: DecisionTableRow[]
  onOpenReference: (chunkId: string) => void
}

export function DecisionTableView({ rows, onOpenReference }: DecisionTableViewProps) {
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
              <th className="decision-table__ref-col" />
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
                <td className="decision-table__ref-col">
                  {row.chunkId && <ReferenceButton onClick={() => onOpenReference(row.chunkId!)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  )
}

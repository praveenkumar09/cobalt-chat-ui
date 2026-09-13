import { CollapsibleSection } from './CollapsibleSection'
import { ReferenceButton } from './ReferenceButton'
import type { DataDictionaryEntry } from '../types'

interface DataDictionaryViewProps {
  entries: DataDictionaryEntry[]
  onOpenReference: (chunkId: string) => void
}

export function DataDictionaryView({ entries, onOpenReference }: DataDictionaryViewProps) {
  if (entries.length === 0) return null

  return (
    <CollapsibleSection label="Data dictionary" count={entries.length}>
      <div className="decision-table-frame">
        <table className="decision-table">
          <thead>
            <tr>
              <th>Business Term</th>
              <th>Technical Field</th>
              <th>Description</th>
              <th className="decision-table__ref-col" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} style={{ animationDelay: `${i * 55}ms` }}>
                <td>{entry.term}</td>
                <td className={entry.technicalName ? 'data-dictionary__technical' : 'decision-table__empty'}>
                  {entry.technicalName || '—'}
                </td>
                <td>{entry.description}</td>
                <td className="decision-table__ref-col">
                  {entry.chunkId && <ReferenceButton onClick={() => onOpenReference(entry.chunkId!)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  )
}

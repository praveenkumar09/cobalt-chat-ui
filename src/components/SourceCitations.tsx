import { useState } from 'react'
import { CodeBlock, type CodeLanguage } from './CodeBlock'
import { CollapsibleSection } from './CollapsibleSection'
import type { SourceCitation } from '../types'

interface SourceCitationsProps {
  sources: SourceCitation[]
}

function detectLanguage(fileType?: string): CodeLanguage {
  return fileType?.toLowerCase().includes('cobol') ? 'cobol' : null
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}

function buildDownloadName(s: SourceCitation): string {
  const dot = s.sourceFile.lastIndexOf('.')
  const ext = dot !== -1 ? s.sourceFile.slice(dot) : '.txt'
  const base = [s.programId, s.sectionName].filter(Boolean).join('_') || s.sourceFile.replace(/\.[^.]+$/, '')
  return sanitizeFilename(`${base}${ext}`)
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (sources.length === 0) return null

  return (
    <CollapsibleSection label="Sources" count={sources.length}>
      <div className="citations__list">
        {sources.map((s) => {
          const isOpen = openId === s.chunkId
          const lineRange =
            s.lineStart != null && s.lineEnd != null ? `L${s.lineStart}–${s.lineEnd}` : null

          return (
            <div key={s.chunkId} className={`citation${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="citation__header"
                onClick={() => setOpenId(isOpen ? null : s.chunkId)}
                aria-expanded={isOpen}
              >
                <svg
                  className="citation__chevron"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <svg
                  className="citation__file-icon"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
                  <path d="M15 2v5h5" />
                </svg>

                <span className="citation__file">{s.sourceFile}</span>
                {s.programId && <span className="citation__badge">{s.programId}</span>}
                {s.sectionName && <span className="citation__badge citation__badge--section">{s.sectionName}</span>}
                {lineRange && <span className="citation__badge citation__badge--lines">{lineRange}</span>}
                <span className="citation__score" title="Relevance to your question">
                  {Math.round(s.similarity * 100)}%
                </span>
              </button>

              <div className={`citation__body-frame${isOpen ? ' is-open' : ''}`}>
                <div className="citation__body-inner">
                  {s.sectionPurpose && <p className="citation__purpose">{s.sectionPurpose}</p>}
                  <CodeBlock
                    code={s.snippet}
                    language={detectLanguage(s.fileType)}
                    startLine={s.lineStart ?? 1}
                    downloadName={buildDownloadName(s)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}

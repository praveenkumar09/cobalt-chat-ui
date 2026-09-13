import { useEffect, useState } from 'react'
import { CodeBlock, type CodeLanguage } from './CodeBlock'
import { fetchProgramSource } from '../api/ragClient'
import type { ProgramSource, SourceCitation } from '../types'

interface CodeReferenceModalProps {
  isOpen: boolean
  /** Business rules / decision table / data dictionary: an already-fetched citation snippet. */
  citation: SourceCitation | null
  /** Key Relationships node click: fetches that program's real full source live. */
  programId: string | null
  onClose: () => void
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

function Shimmer({ label }: { label: string }) {
  return (
    <span className="status-shimmer">
      <span className="status-shimmer__dot" />
      <span className="status-shimmer__text">{label}</span>
    </span>
  )
}

/** Opens either a citation snippet (business rules / decision table / data
 * dictionary references) or a program's real full source fetched live (Key
 * Relationships node clicks) — same single-panel code viewer either way. */
export function CodeReferenceModal({ isOpen, citation, programId, onClose }: CodeReferenceModalProps) {
  const [liveSource, setLiveSource] = useState<ProgramSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!isOpen || !programId) {
      setLiveSource(null)
      setNotFound(false)
      return
    }
    setLiveSource(null)
    setNotFound(false)
    setLoading(true)
    const controller = new AbortController()
    fetchProgramSource(programId, controller.signal)
      .then((res) => setLiveSource(res))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [isOpen, programId])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const title = citation
    ? `${citation.sourceFile}${citation.sectionName ? ` — ${citation.sectionName}` : ''}`
    : programId ?? ''

  return (
    <>
      <div className={`code-compare-backdrop${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`code-compare-modal code-compare-modal--single${isOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-label="Code reference"
      >
        <div className="code-compare-modal__header">
          <span className="code-compare-modal__title">{title}</span>
          <button
            type="button"
            className="code-compare-modal__close"
            onClick={onClose}
            aria-label="Close code reference"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="code-compare-panel__body code-reference-modal__body">
          {citation && (
            <CodeBlock
              code={citation.snippet}
              language={detectLanguage(citation.fileType)}
              startLine={citation.lineStart ?? 1}
              downloadName={buildDownloadName(citation)}
              collapsible={false}
            />
          )}

          {!citation && programId && (
            <>
              {loading && <Shimmer label="Loading source…" />}
              {notFound && <p className="code-compare-empty">Source not available for this file.</p>}
              {liveSource && (
                <CodeBlock
                  code={liveSource.content}
                  language="cobol"
                  startLine={1}
                  downloadName={`${programId}.cbl`}
                  collapsible={false}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

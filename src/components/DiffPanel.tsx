import { useEffect, useState } from 'react'
import type { DiffSegment } from '../utils/diffHunks'

interface DiffPanelProps {
  segments: DiffSegment[]
  /** The full, real file content (not just visible rows) — Copy/Save always
   * operate on the whole file, regardless of which segments are collapsed. */
  fullText: string
  downloadName: string
  /** Changes whenever this is a genuinely new diff (e.g. the underlying
   * proposedSource string) — resets which collapsed segments are expanded,
   * so a regenerated result doesn't inherit expand state from a stale diff. */
  resetKey: string
}

const rowClassName: Record<DiffSegment['kind'], string | undefined> = {
  added: 'code-line-added',
  removed: 'code-line-removed',
  same: undefined,
}

/** Renders one side of a GitHub-PR-style diff: collapsed segments show as a
 * single "Show N unchanged lines" toggle row instead of real content, so a
 * huge file with a small, localized change only puts a handful of rows in
 * the DOM by default — see buildDiffSegments for how segments are built. */
export function DiffPanel({ segments, fullText, downloadName, resetKey }: DiffPanelProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setExpanded(new Set())
  }, [resetKey])

  const expandSegment = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
    } catch {
      const el = document.createElement('textarea')
      el.value = fullText
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const download = () => {
    const blob = new Blob([`${fullText}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="code-block">
      <div className="code-block__toolbar">
        <span className="code-block__lang">cobol</span>
        <div className="code-block__toolbar-actions">
          <button
            type="button"
            className="code-block__icon-btn"
            onClick={copy}
            aria-label={copied ? 'Copied to clipboard' : 'Copy code'}
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12.5 10 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path
                  d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button type="button" className="code-block__icon-btn" onClick={download} aria-label="Download code as a file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3v12m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="code-block__body">
        <table className="code-block__plain">
          <tbody>
            {segments.map((seg, i) => {
              if (seg.kind === 'same' && seg.collapsed && !expanded.has(i)) {
                return (
                  <tr key={i} className="diff-expand-row">
                    <td className="code-block__gutter" />
                    <td className="code-block__line-text">
                      <button type="button" className="diff-expand-btn" onClick={() => expandSegment(i)}>
                        ⋯ Show {seg.lines.length} unchanged line{seg.lines.length === 1 ? '' : 's'} ⋯
                      </button>
                    </td>
                  </tr>
                )
              }
              return seg.lines.map((line, j) => (
                <tr key={`${i}-${j}`} className={rowClassName[seg.kind]}>
                  <td className="code-block__gutter">{seg.startLine + j}</td>
                  <td className="code-block__line-text">{line.length ? line : ' '}</td>
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import cobol from 'react-syntax-highlighter/dist/esm/languages/prism/cobol'
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import { useDomTheme } from '../hooks/useDomTheme'

SyntaxHighlighter.registerLanguage('cobol', cobol)

const PREVIEW_LINES = 12
const LINE_HEIGHT_PX = 19

export type CodeLanguage = 'cobol' | null
export type DiffLineKind = 'same' | 'added' | 'removed'

interface CodeBlockProps {
  code: string
  language: CodeLanguage
  startLine?: number
  downloadName: string
  /** Set false for a full-file view (compare modal) where truncation doesn't apply. */
  collapsible?: boolean
  /** Per-line diff annotation (index 0 = startLine) — tints added/removed lines. */
  lineKinds?: DiffLineKind[]
}

export function CodeBlock({
  code,
  language,
  startLine = 1,
  downloadName,
  collapsible: collapsibleProp = true,
  lineKinds,
}: CodeBlockProps) {
  const theme = useDomTheme()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const trimmed = useMemo(() => code.replace(/\n+$/, ''), [code])
  const lines = useMemo(() => trimmed.split('\n'), [trimmed])
  const collapsible = collapsibleProp && lines.length > PREVIEW_LINES
  const isCollapsed = collapsible && !expanded

  const lineClassName = (lineNumber: number): string | undefined => {
    const kind = lineKinds?.[lineNumber - startLine]
    return kind && kind !== 'same' ? `code-line-${kind}` : undefined
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed)
    } catch {
      const el = document.createElement('textarea')
      el.value = trimmed
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
    const blob = new Blob([`${trimmed}\n`], { type: 'text/plain;charset=utf-8' })
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
        <span className="code-block__lang">{language ?? 'text'}</span>
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

      <div
        className={`code-block__body${isCollapsed ? ' is-collapsed' : ''}`}
        style={isCollapsed ? { maxHeight: PREVIEW_LINES * LINE_HEIGHT_PX + 16 } : undefined}
      >
        {language ? (
          <SyntaxHighlighter
            language={language}
            style={theme === 'dark' ? oneDark : oneLight}
            showLineNumbers
            startingLineNumber={startLine}
            wrapLongLines={false}
            wrapLines={!!lineKinds}
            lineProps={lineKinds ? (lineNumber: number) => {
              const className = lineClassName(lineNumber)
              return className ? { className } : {}
            } : undefined}
            customStyle={{
              margin: 0,
              padding: '10px 12px',
              background: 'transparent',
              fontSize: '0.72rem',
              lineHeight: 1.55,
            }}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              opacity: 0.4,
              userSelect: 'none',
            }}
            codeTagProps={{ style: { fontFamily: 'inherit' } }}
          >
            {trimmed}
          </SyntaxHighlighter>
        ) : (
          <table className="code-block__plain">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className={lineClassName(startLine + i)}>
                  <td className="code-block__gutter">{startLine + i}</td>
                  <td className="code-block__line-text">{line.length ? line : ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isCollapsed && <div className="code-block__fade" />}
      </div>

      {collapsible && (
        <button type="button" className="code-block__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show ${lines.length - PREVIEW_LINES} more lines`}
        </button>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { CodeBlock, type CodeLanguage } from './CodeBlock'

// Rendered live while streaming too (not deferred to completion) — word-
// boundary buffering and RAF batching upstream (see useChat) mean content only
// ever grows at completed-word boundaries, so react-markdown never has to
// reinterpret a mid-word fragment. The one remaining risk is a still-*open*
// block construct (an unclosed ``` fence or table) reflowing once it closes;
// react-markdown renders those as plain/partial text in the meantime rather
// than erroring, so the worst case is a brief plain-text tail, not breakage.
// Syntax highlighting is still deferred until the stream ends (see
// `isStreaming` below) — re-highlighting a growing code block on every reveal
// would be the one genuinely expensive thing to redo that often, especially
// for the COBOL snippets this app streams back constantly.

const KNOWN_LANGUAGES = new Set(['cobol'])

function toCodeLanguage(tag: string | undefined): CodeLanguage {
  const lower = tag?.toLowerCase()
  return lower && KNOWN_LANGUAGES.has(lower) ? (lower as CodeLanguage) : null
}

function buildComponents(isStreaming: boolean): Components {
  return {
    // Fenced code blocks arrive as <pre><code className="language-x">; the
    // `code` override below renders its own container, so the default <pre>
    // wrapper is unwrapped here to avoid nesting it around that.
    pre: ({ children }) => <>{children}</>,
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className ?? '')
      if (match) {
        const language = toCodeLanguage(match[1])
        const code = String(children)
        if (isStreaming) {
          // Plain, unhighlighted — avoids re-running syntax highlighting on
          // every reveal for a fence that's still growing.
          return <pre className="md-code-pending"><code>{code}</code></pre>
        }
        return <CodeBlock code={code} language={language} downloadName={`snippet.${language ?? 'txt'}`} />
      }
      return <code className="md-inline-code">{children}</code>
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  }
}

export function MarkdownMessage({ content, isStreaming = false }: { content: string; isStreaming?: boolean }) {
  const components = useMemo(() => buildComponents(isStreaming), [isStreaming])
  return (
    <div className={`md-content${isStreaming ? ' md-content--streaming' : ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}

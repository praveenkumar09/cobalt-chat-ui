import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { CodeBlock, type CodeLanguage } from './CodeBlock'

// Only rendered once a message has finished streaming (see MessageBubble) —
// parsing markdown mid-stream would mean an as-yet-unclosed construct (a
// dangling ** or an open ``` fence) gets reinterpreted, sometimes reflowing
// already-shown text, every time the next token arrives. That's exactly the
// class of bug the streaming-side fixes (RAF batching, word-boundary
// buffering, reveal pacing) exist to eliminate, so this component stays out
// of the streaming path entirely and only takes over once content is final.

const KNOWN_LANGUAGES = new Set(['cobol'])

function toCodeLanguage(tag: string | undefined): CodeLanguage {
  const lower = tag?.toLowerCase()
  return lower && KNOWN_LANGUAGES.has(lower) ? (lower as CodeLanguage) : null
}

const components: Components = {
  // Fenced code blocks arrive as <pre><code className="language-x">; the
  // `code` override below renders the full CodeBlock (with its own
  // container), so the default <pre> wrapper is unwrapped here to avoid
  // nesting it around that.
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? '')
    if (match) {
      const language = toCodeLanguage(match[1])
      return (
        <CodeBlock
          code={String(children)}
          language={language}
          downloadName={`snippet.${language ?? 'txt'}`}
        />
      )
    }
    return <code className="md-inline-code">{children}</code>
  },
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="md-content">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}

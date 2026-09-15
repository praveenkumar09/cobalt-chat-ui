import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

// Only rendered once a message has finished streaming (see MessageBubble) —
// parsing markdown mid-stream would mean an as-yet-unclosed construct (a
// dangling ** or an open ``` fence) gets reinterpreted, sometimes reflowing
// already-shown text, every time the next token arrives. That's exactly the
// class of bug the streaming-side fixes (RAF batching, word-boundary
// buffering, reveal pacing) exist to eliminate, so this component stays out
// of the streaming path entirely and only takes over once content is final.

const components: Components = {
  // Fenced code blocks arrive as <pre><code className="language-x">; the
  // `code` override below renders its own <pre>, so the default wrapper is
  // unwrapped here to avoid nesting one <pre> inside another.
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const isFenced = /language-(\w+)/.test(className ?? '')
    if (isFenced) {
      return (
        <pre className="md-code-block">
          <code>{children}</code>
        </pre>
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

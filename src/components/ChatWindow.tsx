import { useEffect, useRef, useState } from 'react'
import { Header } from './Header'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ResizeHandle } from './ResizeHandle'
import { useChat } from '../hooks/useChat'
import { useResizable } from '../hooks/useResizable'
import { useTheme } from '../hooks/useTheme'
import { useFontSize } from '../hooks/useFontSize'
import { useRelationshipView } from '../hooks/useRelationshipView'

const SUGGESTIONS = [
  'What does my critical illness plan cover?',
  'How do I file a claim for hospitalization?',
  'Explain the waiting period for my policy.',
]

export function ChatWindow() {
  const { messages, mode, setMode, isBusy, send, stop, clear, regenerate } = useChat()
  const { size, isDragging, handleProps } = useResizable()
  const { theme, toggleTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const { relationshipView, setRelationshipView } = useRelationshipView()
  const [easyMode, setEasyMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const windowClassName = [
    'chat-window',
    isDragging ? 'chat-window--dragging' : '',
    easyMode ? 'chat-window--easy' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={windowClassName} style={easyMode ? undefined : { width: size.width, height: size.height }}>
      <Header
        mode={mode}
        onModeChange={setMode}
        onClear={clear}
        disabled={isBusy}
        easyMode={easyMode}
        onToggleEasyMode={() => setEasyMode((v) => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        relationshipView={relationshipView}
        onRelationshipViewChange={setRelationshipView}
      />

      <div className="chat-body" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <img className="empty-state__hero" src="/aia-orbit-hero.png" alt="AIA Orbit mascot" />
            <h2>How can I help you today?</h2>
            <p>Ask anything about your AIA policies, claims, or coverage.</p>
            <div className="suggestion-list">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRegenerate={regenerate}
              onAsk={send}
              isBusy={isBusy}
              isLatest={i === messages.length - 1}
              relationshipView={relationshipView}
            />
          ))
        )}
      </div>

      <ChatInput onSend={send} onStop={stop} isBusy={isBusy} />
      <ResizeHandle {...handleProps} />
    </div>
  )
}

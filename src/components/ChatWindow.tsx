import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './Header'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ResizeHandle } from './ResizeHandle'
import { HistoryDrawer } from './HistoryDrawer'
import { useChat } from '../hooks/useChat'
import { useResizable } from '../hooks/useResizable'
import { useTheme } from '../hooks/useTheme'
import { useFontSize } from '../hooks/useFontSize'
import { useRelationshipView } from '../hooks/useRelationshipView'
import { useViewMode } from '../hooks/useViewMode'
import { useSuggestions } from '../hooks/useSuggestions'
import type { Session } from '../hooks/useSession'

interface ChatWindowProps {
  session: Session
  onLogout: () => void
}

export function ChatWindow({ session, onLogout }: ChatWindowProps) {
  const { viewMode, setViewMode } = useViewMode()
  const {
    messages,
    mode,
    setMode,
    isBusy,
    send,
    stop,
    newChat,
    regenerate,
    branchFrom,
    selectSibling,
    loadConversation,
    conversationId,
    activeViewMode,
    canChangeViewMode,
  } = useChat(viewMode)
  const { size, isDragging, handleProps } = useResizable()
  const { theme, toggleTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const { relationshipView, setRelationshipView } = useRelationshipView()
  const { suggestions, loading: suggestionsLoading } = useSuggestions()
  // Full page by default after login — the existing shrink/expand toggle lets
  // the user collapse back to the floating resizable widget.
  const [easyMode, setEasyMode] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [branchingFrom, setBranchingFrom] = useState<{ id: string; label: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Tracks whether the user is already at the bottom, so streaming tokens keep
  // the view pinned there without fighting a scroll they did to read upward.
  const stickToBottomRef = useRef(true)
  // Lets handleBranch read the latest messages without depending on `messages`
  // directly — that array gets a new reference on every streamed token, which
  // would otherwise give handleBranch a new identity every frame too, and
  // defeat MessageBubble's memoization (onBranch is one of its props).
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const handleSelectConversation = (id: string) => {
    loadConversation(id)
    setBranchingFrom(null)
    setHistoryOpen(false)
  }

  const handleNewChat = () => {
    newChat()
    setBranchingFrom(null)
    setHistoryOpen(false)
  }

  const handleBranch = useCallback((messageId: string) => {
    const source = messagesRef.current.find((m) => m.id === messageId)
    const label = source ? source.content.slice(0, 60) : ''
    setBranchingFrom({ id: messageId, label })
  }, [])

  const handleSend = (question: string) => {
    if (branchingFrom) {
      const parentId = branchingFrom.id
      setBranchingFrom(null)
      branchFrom(parentId, question)
    } else {
      send(question)
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distanceFromBottom < 80
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    // Streaming updates fire on every token — an animated `behavior: 'smooth'`
    // scroll restarted that often fights its own previous animation and
    // visibly bounces. Snapping instantly instead makes the view simply
    // follow the growing content, which reads as smooth continuous scroll.
    el.scrollTop = el.scrollHeight
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
        onNewChat={handleNewChat}
        historyOpen={historyOpen}
        onToggleHistory={() => setHistoryOpen((v) => !v)}
        disabled={isBusy}
        easyMode={easyMode}
        onToggleEasyMode={() => setEasyMode((v) => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        relationshipView={relationshipView}
        onRelationshipViewChange={setRelationshipView}
        viewMode={activeViewMode}
        onViewModeChange={setViewMode}
        viewModeLocked={!canChangeViewMode}
        email={session.email}
        onLogout={onLogout}
      />

      <div className="chat-body" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <img className="empty-state__hero" src="/aia-orbit-hero.png" alt="AIA Orbit mascot" />
            <h2>How can I help you today?</h2>
            <p>Ask anything about your AIA policies, claims, or coverage.</p>
            <div className="suggestion-list">
              {suggestionsLoading ? (
                <>
                  <span className="suggestion-chip suggestion-chip--skeleton" aria-hidden="true" />
                  <span className="suggestion-chip suggestion-chip--skeleton" aria-hidden="true" />
                  <span className="suggestion-chip suggestion-chip--skeleton" aria-hidden="true" />
                </>
              ) : (
                suggestions.map((s) => (
                  <button key={s} type="button" className="suggestion-chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRegenerate={regenerate}
              onAsk={send}
              onBranch={handleBranch}
              onSelectSibling={selectSibling}
              isBusy={isBusy}
              isLatest={i === messages.length - 1}
              relationshipView={relationshipView}
              viewMode={activeViewMode}
              responseMode={mode}
            />
          ))
        )}
      </div>

      {branchingFrom && (
        <div className="branch-chip">
          <span className="branch-chip__label">
            Branching from: “{branchingFrom.label}
            {branchingFrom.label.length >= 60 ? '…' : ''}”
          </span>
          <button
            type="button"
            className="branch-chip__dismiss"
            onClick={() => setBranchingFrom(null)}
            aria-label="Cancel branching"
          >
            ✕
          </button>
        </div>
      )}

      <ChatInput onSend={handleSend} onStop={stop} isBusy={isBusy} />
      <ResizeHandle {...handleProps} />

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectConversation}
        activeConversationId={conversationId}
      />
    </div>
  )
}

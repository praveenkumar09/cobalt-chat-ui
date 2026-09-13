import { useCallback, useEffect, useState } from 'react'
import { deleteConversation, fetchConversations } from '../api/ragClient'
import type { ConversationSummary } from '../types'

const PAGE_SIZE = 10

interface HistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (id: string) => void
  activeConversationId: string
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function HistoryDrawer({ isOpen, onClose, onSelect, activeConversationId }: HistoryDrawerProps) {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetchConversations(PAGE_SIZE, offset)
      setItems((prev) => (append ? [...prev, ...res.conversations] : res.conversations))
      setHasMore(res.hasMore)
    } catch {
      if (!append) setItems([])
      setHasMore(false)
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setConfirmId(null)
      loadPage(0, false)
    }
  }, [isOpen, loadPage])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleDeleteConfirmed = async (id: string) => {
    setConfirmId(null)
    setItems((prev) => prev.filter((c) => c.id !== id))
    try {
      await deleteConversation(id)
    } catch {
      // Best-effort — if this fails, the item just reappears next time the drawer opens.
    }
  }

  return (
    <>
      <div className={`history-backdrop${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div className={`history-drawer${isOpen ? ' is-open' : ''}`} role="dialog" aria-label="Chat history">
        <div className="history-drawer__header">
          <span>Chat history</span>
          <button type="button" className="history-drawer__close" onClick={onClose} aria-label="Close history">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="history-drawer__list">
          {loading ? (
            <>
              <span className="history-item history-item--skeleton" />
              <span className="history-item history-item--skeleton" />
              <span className="history-item history-item--skeleton" />
            </>
          ) : items.length === 0 ? (
            <p className="history-drawer__empty">No conversations yet — they'll show up here for a day.</p>
          ) : (
            items.map((c, i) => (
              <div
                key={c.id}
                className={`history-item${c.id === activeConversationId ? ' is-active' : ''}`}
                style={{ animationDelay: `${260 + Math.min(i, 10) * 45}ms` }}
              >
                <button type="button" className="history-item__body" onClick={() => onSelect(c.id)}>
                  <span className="history-item__title">{c.title || 'New conversation'}</span>
                  <span className="history-item__meta">
                    {formatRelativeTime(c.lastActiveAt)} · {c.messageCount} msg{c.messageCount === 1 ? '' : 's'}
                  </span>
                </button>

                {confirmId === c.id ? (
                  <div className="history-item__confirm">
                    <span>Delete?</span>
                    <button type="button" className="history-item__confirm-btn" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="history-item__confirm-btn history-item__confirm-btn--danger"
                      onClick={() => handleDeleteConfirmed(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="history-item__delete"
                    onClick={() => setConfirmId(c.id)}
                    aria-label="Delete this chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path
                        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7h10Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}

          {hasMore && !loading && (
            <button type="button" className="history-drawer__more" onClick={() => loadPage(items.length, true)} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'More'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

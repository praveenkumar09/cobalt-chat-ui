import { useCallback, useRef, useState } from 'react'
import { askComplete, askStream, RagApiError } from '../api/ragClient'
import { playReceiveSound } from '../utils/sound'
import type { Message, ResponseMode } from '../types'

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// SSE tokens are sub-word LLM tokenizer pieces, not whole words — a word can
// arrive as "COB" then "OL" a moment later. Displaying the raw accumulator
// immediately means that still-forming trailing fragment briefly shows on
// screen only to change/extend right after, which reads as the text
// "scrambling" while streaming. This returns only the text up to the last
// completed word boundary, holding back a still-forming trailing fragment
// until the next token confirms it's finished (or the stream ends, when the
// full text — fragment included — is always shown regardless; see the
// explicit final flush below, which never uses this function). Falls back to
// showing everything once the trailing fragment gets unreasonably long (no
// natural boundary yet), so nothing ever visibly hangs waiting for one.
function safeDisplayText(full: string): string {
  const lastBoundary = Math.max(full.lastIndexOf(' '), full.lastIndexOf('\n'), full.lastIndexOf('\t'))
  const tailLength = full.length - (lastBoundary + 1)
  if (lastBoundary === -1) {
    return tailLength > 60 ? full : ''
  }
  return tailLength > 60 ? full : full.slice(0, lastBoundary + 1)
}

// Network delivery isn't perfectly steady — proxies, TCP buffering, and the
// model itself can all cause tokens to arrive in occasional bursts, more so
// the longer a response runs (more total data, more opportunity for one).
// Jumping straight to whatever's newly safe to show (via safeDisplayText) on
// every frame means a burst dumps a big chunk of text into the DOM in one
// reflow — visually jarring regardless of how smooth arrival was a moment
// before. This caps how much NEW text is revealed per frame once a backlog
// exists, so a burst gets spread across a few frames as a smooth catch-up
// instead of slamming into view at once. Small, normal token-by-token deltas
// (the common case) still show immediately, no added latency — the backlog
// after one ordinary token is well under SMALL_BACKLOG_CHARS.
const SMALL_BACKLOG_CHARS = 12

function nextRevealLength(current: number, target: number): number {
  const backlog = target - current
  if (backlog <= SMALL_BACKLOG_CHARS) return target
  return current + Math.max(SMALL_BACKLOG_CHARS, Math.ceil(backlog * 0.35))
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<ResponseMode>('stream')
  const [isBusy, setIsBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isBusy) return

      const userMessage: Message = { id: makeId(), role: 'user', content: trimmed }
      const assistantId = makeId()
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        stage: 'thinking',
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      // Reveals at most one animation frame's worth of newly-safe text at a
      // time (see nextRevealLength) instead of jumping straight to whatever
      // safeDisplayText allows — coalescing rapid SSE bursts into a smooth,
      // bounded-per-frame reveal rather than one big reflow. Self-reschedules
      // while there's still backlog to drain even if no new token arrives in
      // the meantime, so a burst keeps catching up smoothly on its own.
      let rafHandle: number | null = null
      let revealedLength = 0
      const cancelPendingFlush = () => {
        if (rafHandle !== null) {
          cancelAnimationFrame(rafHandle)
          rafHandle = null
        }
      }

      try {
        if (mode === 'stream') {
          timersRef.current.push(
            setTimeout(() => updateMessage(assistantId, { stage: 'retrieving' }), 450),
          )

          let accumulated = ''
          const scheduleReveal = () => {
            if (rafHandle !== null) return
            rafHandle = requestAnimationFrame(() => {
              rafHandle = null
              const target = safeDisplayText(accumulated).length
              revealedLength = nextRevealLength(revealedLength, target)
              updateMessage(assistantId, { content: accumulated.slice(0, revealedLength), stage: undefined })
              if (revealedLength < target) {
                scheduleReveal()
              }
            })
          }

          await askStream(
            trimmed,
            {
              onMetadata: (meta) => {
                clearTimers()
                updateMessage(assistantId, {
                  stage: 'generating',
                  sources: meta.sources,
                  graphContext: meta.graphContext,
                  chunksRetrieved: meta.chunksRetrieved,
                })
              },
              onToken: (token) => {
                accumulated += token
                scheduleReveal()
              },
            },
            controller.signal,
          )
          // The stream finished — cancel any still-pending batched flush (its
          // content would already be stale) and commit the final text directly,
          // in the same update that flips isStreaming off.
          cancelPendingFlush()
          updateMessage(assistantId, { content: accumulated, isStreaming: false, stage: undefined })
          playReceiveSound()
        } else {
          timersRef.current.push(
            setTimeout(() => updateMessage(assistantId, { stage: 'retrieving' }), 700),
            setTimeout(() => updateMessage(assistantId, { stage: 'generating' }), 1800),
          )

          const response = await askComplete(trimmed, controller.signal)
          clearTimers()
          updateMessage(assistantId, {
            content: response.answer,
            sources: response.sources,
            graphContext: response.graphContext,
            chunksRetrieved: response.chunksRetrieved,
            isStreaming: false,
            stage: undefined,
          })
          playReceiveSound()
        }
      } catch (err) {
        clearTimers()
        cancelPendingFlush()
        if ((err as Error).name === 'AbortError') {
          updateMessage(assistantId, { isStreaming: false, stage: undefined })
        } else {
          const message =
            err instanceof RagApiError
              ? err.message
              : 'Unable to reach the assistant. Please check the API is running on port 8083.'
          updateMessage(assistantId, { content: message, isStreaming: false, stage: undefined, error: true })
        }
      } finally {
        setIsBusy(false)
        abortRef.current = null
      }
    },
    [isBusy, mode, updateMessage],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, mode, setMode, isBusy, send, stop, clear }
}

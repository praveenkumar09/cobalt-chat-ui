import { useCallback, useRef, useState } from 'react'
import { askComplete, askStream, RagApiError } from '../api/ragClient'
import { playReceiveSound } from '../utils/sound'
import type { Message, ResponseMode } from '../types'

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

      // Coalesces rapid SSE token bursts into at most one re-render per animation
      // frame. The stream can deliver far more tokens/sec than the browser can
      // paint; re-wrapping the paragraph on every single token instead of once per
      // frame is what visibly "scrambles" words near the wrap boundary while
      // streaming. This never delays or drops a token — every character still
      // lands in `accumulated` immediately — it only batches how often that gets
      // committed to React state/the DOM, so it's strictly less render work, never more.
      let rafHandle: number | null = null
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
                if (rafHandle === null) {
                  rafHandle = requestAnimationFrame(() => {
                    rafHandle = null
                    updateMessage(assistantId, { content: accumulated, stage: undefined })
                  })
                }
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

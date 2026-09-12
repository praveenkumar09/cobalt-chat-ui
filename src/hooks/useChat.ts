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
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const runAsk = useCallback(
    async (question: string, assistantId: string) => {
      setIsBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        if (mode === 'stream') {
          timersRef.current.push(
            setTimeout(() => updateMessage(assistantId, { stage: 'retrieving' }), 450),
          )

          let accumulated = ''
          await askStream(
            question,
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
                updateMessage(assistantId, { content: accumulated, stage: undefined })
              },
              onCorrection: (sources, graphContext) => {
                updateMessage(assistantId, { sources, graphContext })
              },
              onFollowups: (followUpQuestions) => {
                updateMessage(assistantId, { followUpQuestions })
              },
            },
            controller.signal,
          )
          updateMessage(assistantId, { isStreaming: false, stage: undefined })
          playReceiveSound()
        } else {
          timersRef.current.push(
            setTimeout(() => updateMessage(assistantId, { stage: 'retrieving' }), 700),
            setTimeout(() => updateMessage(assistantId, { stage: 'generating' }), 1800),
          )

          const response = await askComplete(question, controller.signal)
          clearTimers()
          updateMessage(assistantId, {
            content: response.answer,
            sources: response.sources,
            graphContext: response.graphContext,
            chunksRetrieved: response.chunksRetrieved,
            followUpQuestions: response.followUpQuestions,
            isStreaming: false,
            stage: undefined,
          })
          playReceiveSound()
        }
      } catch (err) {
        clearTimers()
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
    [mode, updateMessage],
  )

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
        sourceQuestion: trimmed,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      await runAsk(trimmed, assistantId)
    },
    [isBusy, runAsk],
  )

  const regenerate = useCallback(
    async (assistantId: string) => {
      if (isBusy) return
      const target = messagesRef.current.find((m) => m.id === assistantId)
      if (!target?.sourceQuestion) return

      updateMessage(assistantId, {
        content: '',
        isStreaming: true,
        error: false,
        stage: 'thinking',
        sources: undefined,
        graphContext: undefined,
        chunksRetrieved: undefined,
        followUpQuestions: undefined,
      })
      await runAsk(target.sourceQuestion, assistantId)
    },
    [isBusy, runAsk, updateMessage],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, mode, setMode, isBusy, send, stop, clear, regenerate }
}

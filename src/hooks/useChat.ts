import { useCallback, useRef, useState } from 'react'
import {
  askComplete,
  askStream,
  fetchConversation,
  selectBranch as selectBranchApi,
  upsertMessage,
  RagApiError,
} from '../api/ragClient'
import { playReceiveSound } from '../utils/sound'
import type {
  ConversationDetail,
  ImpactAnalysis,
  Message,
  ResponseMode,
  SourceCitation,
  GraphRelationship,
  StoredMessagePayload,
} from '../types'

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function toMessages(detail: ConversationDetail): Message[] {
  return detail.messages.map((m, i) => {
    const message: Message = {
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.payload?.sources,
      graphContext: m.payload?.graphContext,
      followUpQuestions: m.payload?.followUpQuestions,
      error: m.payload?.error,
      impactAnalysis: m.payload?.impactAnalysis,
      parentId: m.parentId,
      siblingIds: m.siblingIds,
      siblingIndex: m.siblingIndex,
    }
    if (m.role === 'assistant') {
      for (let j = i - 1; j >= 0; j--) {
        if (detail.messages[j].role === 'user') {
          message.sourceQuestion = detail.messages[j].content
          break
        }
      }
    }
    return message
  })
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [mode, setMode] = useState<ResponseMode>('stream')
  const [isBusy, setIsBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string>(() => makeId())
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
    async (question: string, assistantId: string, assistantParentId: string | null) => {
      setIsBusy(true)

      const controller = new AbortController()
      abortRef.current = controller

      let finalContent = ''
      let finalSources: SourceCitation[] | undefined
      let finalGraphContext: GraphRelationship[] | undefined
      let finalFollowUps: string[] | undefined
      let finalImpactAnalysis: ImpactAnalysis | null | undefined
      let finalError = false

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
                finalSources = meta.sources
                finalGraphContext = meta.graphContext
                finalImpactAnalysis = meta.impactAnalysis ?? null
                updateMessage(assistantId, {
                  stage: 'generating',
                  sources: meta.sources,
                  graphContext: meta.graphContext,
                  chunksRetrieved: meta.chunksRetrieved,
                  impactAnalysis: meta.impactAnalysis ?? null,
                })
              },
              onToken: (token) => {
                accumulated += token
                finalContent = accumulated
                updateMessage(assistantId, { content: accumulated, stage: undefined })
              },
              onCorrection: (sources, graphContext, impactAnalysis) => {
                finalSources = sources
                finalGraphContext = graphContext
                finalImpactAnalysis = impactAnalysis
                updateMessage(assistantId, { sources, graphContext, impactAnalysis })
              },
              onFollowups: (followUpQuestions) => {
                finalFollowUps = followUpQuestions
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
          finalContent = response.answer
          finalSources = response.sources
          finalGraphContext = response.graphContext
          finalFollowUps = response.followUpQuestions
          finalImpactAnalysis = response.impactAnalysis
          updateMessage(assistantId, {
            content: response.answer,
            sources: response.sources,
            graphContext: response.graphContext,
            chunksRetrieved: response.chunksRetrieved,
            followUpQuestions: response.followUpQuestions,
            impactAnalysis: response.impactAnalysis,
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
          finalContent = message
          finalError = true
          updateMessage(assistantId, { content: message, isStreaming: false, stage: undefined, error: true })
        }
      } finally {
        setIsBusy(false)
        abortRef.current = null
      }

      const payload: StoredMessagePayload = {
        sources: finalSources,
        graphContext: finalGraphContext,
        followUpQuestions: finalFollowUps,
        error: finalError || undefined,
        impactAnalysis: finalImpactAnalysis,
      }
      // Awaited so callers that need to re-sync with the server afterward (e.g.
      // branchFrom, to pick up sibling metadata) know the message has actually landed.
      await upsertMessage(conversationId, assistantId, 'assistant', finalContent, payload, assistantParentId)
    },
    [mode, updateMessage, conversationId],
  )

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isBusy) return

      const current = messagesRef.current
      const parentId = current.length > 0 ? current[current.length - 1].id : null

      const userMessage: Message = { id: makeId(), role: 'user', content: trimmed, parentId }
      const assistantId = makeId()
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        stage: 'thinking',
        sourceQuestion: trimmed,
        parentId: userMessage.id,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      upsertMessage(conversationId, userMessage.id, 'user', trimmed, null, parentId)
      await runAsk(trimmed, assistantId, userMessage.id)
    },
    [isBusy, runAsk, conversationId],
  )

  /** Starts an alternate follow-up from parentMessageId as a sibling of whatever
   * originally came next, leaving the current path untouched in the database. */
  const branchFrom = useCallback(
    async (parentMessageId: string, question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isBusy) return

      const userMessage: Message = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        parentId: parentMessageId,
        justBranched: true,
      }
      const assistantId = makeId()
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        stage: 'thinking',
        sourceQuestion: trimmed,
        parentId: userMessage.id,
        justBranched: true,
      }

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === parentMessageId)
        const base = idx >= 0 ? prev.slice(0, idx + 1) : prev
        return [...base, userMessage, assistantMessage]
      })
      await upsertMessage(conversationId, userMessage.id, 'user', trimmed, null, parentMessageId)
      await runAsk(trimmed, assistantId, userMessage.id)

      // The branch is now persisted (both messages landed and current_leaf_id
      // was advanced). Re-sync with the server so the branch point picks up
      // real sibling metadata — only the server knows the prior sibling exists,
      // since we truncated it out of local state above.
      try {
        const detail = await fetchConversation(conversationId)
        const branchIds = new Set([userMessage.id, assistantId])
        setMessages(toMessages(detail).map((m) => (branchIds.has(m.id) ? { ...m, justBranched: true } : m)))
        window.setTimeout(() => {
          setMessages((prev) => prev.map((m) => (branchIds.has(m.id) ? { ...m, justBranched: false } : m)))
        }, 900)
      } catch {
        // Best-effort — the branch itself already succeeded; only the sibling
        // arrows would be missing until the next load if this refresh fails.
      }
    },
    [isBusy, runAsk, conversationId],
  )

  /** Switches the active path to run through messageId's branch (a sibling nav click). */
  const selectSibling = useCallback(
    async (messageId: string) => {
      if (isBusy) return
      try {
        const detail = await selectBranchApi(conversationId, messageId)
        setMessages(toMessages(detail))
      } catch {
        // Best-effort — leave the view as-is if the switch fails.
      }
    },
    [isBusy, conversationId],
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
        impactAnalysis: undefined,
      })
      await runAsk(target.sourceQuestion, assistantId, target.parentId ?? null)
    },
    [isBusy, runAsk, updateMessage],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /** Starts a fresh conversation. Nothing is deleted — the prior one stays in
   * history because it was already persisted incrementally as it happened. */
  const newChat = useCallback(() => {
    setMessages([])
    setConversationId(makeId())
  }, [])

  /** Restores a past conversation from history into the active chat window. */
  const loadConversation = useCallback(async (id: string) => {
    if (isBusy) return
    try {
      const detail = await fetchConversation(id)
      setMessages(toMessages(detail))
      setConversationId(id)
    } catch {
      // Best-effort — if the conversation is gone (deleted/expired), do nothing.
    }
  }, [isBusy])

  return {
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
  }
}

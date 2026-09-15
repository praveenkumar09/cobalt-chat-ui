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
  BusinessRule,
  DecisionTableRow,
  BusinessFlow,
  DataDictionaryEntry,
  TechnicalRule,
  Message,
  ResponseMode,
  SourceCitation,
  GraphRelationship,
  StoredMessagePayload,
} from '../types'

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
      businessRules: m.payload?.businessRules,
      decisionTable: m.payload?.decisionTable,
      businessFlow: m.payload?.businessFlow,
      dataDictionary: m.payload?.dataDictionary,
      technicalRules: m.payload?.technicalRules,
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

  // isBusy (React state) only updates once a re-render commits — a guard
  // like `if (isBusy) return` reads whatever was true when THIS closure was
  // created, which can be stale for a beat. A fast double-click/double-Enter
  // can slip both calls through that window before any state update lands.
  // isBusyRef is written synchronously in the same tick setBusy is called,
  // so a guard checking it is never stale, no matter how fast the next call
  // comes in.
  const isBusyRef = useRef(false)
  const setBusy = useCallback((value: boolean) => {
    isBusyRef.current = value
    setIsBusy(value)
  }, [])

  // Belt-and-suspenders backstop for the same race: even if isBusyRef somehow
  // didn't prevent two runAsk calls from both starting for the SAME
  // assistantId (e.g. two rapid regenerate() calls), only one can be the
  // most-recent "generation" for that id. Every state-mutating callback
  // inside runAsk checks this before writing, so a superseded stream's
  // updates become silent no-ops instead of interleaving with the current
  // stream's — which is what actually produces spliced-together, garbled
  // text (words/fragments from two different concurrent generations landing
  // in the same message as their writes alternate).
  const streamGenerationRef = useRef<Map<string, number>>(new Map())

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const runAsk = useCallback(
    async (question: string, assistantId: string, assistantParentId: string | null) => {
      setBusy(true)

      // This invocation's generation for this assistantId — see
      // streamGenerationRef above. Any later runAsk call for the SAME
      // assistantId bumps this past what's stored here, so isCurrent()
      // starts returning false for THIS invocation from that point on.
      const myGeneration = (streamGenerationRef.current.get(assistantId) ?? 0) + 1
      streamGenerationRef.current.set(assistantId, myGeneration)
      const isCurrent = () => streamGenerationRef.current.get(assistantId) === myGeneration
      const safeUpdate = (patch: Partial<Message>) => {
        if (isCurrent()) updateMessage(assistantId, patch)
      }

      const controller = new AbortController()
      abortRef.current = controller

      let finalContent = ''
      let finalSources: SourceCitation[] | undefined
      let finalGraphContext: GraphRelationship[] | undefined
      let finalFollowUps: string[] | undefined
      let finalImpactAnalysis: ImpactAnalysis | null | undefined
      let finalBusinessRules: BusinessRule[] | undefined
      let finalDecisionTable: DecisionTableRow[] | undefined
      let finalBusinessFlow: BusinessFlow | null | undefined
      let finalDataDictionary: DataDictionaryEntry[] | undefined
      let finalTechnicalRules: TechnicalRule[] | undefined
      let finalError = false
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
            setTimeout(() => safeUpdate({ stage: 'retrieving' }), 450),
          )

          let accumulated = ''
          const scheduleReveal = () => {
            if (rafHandle !== null) return
            rafHandle = requestAnimationFrame(() => {
              rafHandle = null
              const target = safeDisplayText(accumulated).length
              revealedLength = nextRevealLength(revealedLength, target)
              safeUpdate({ content: accumulated.slice(0, revealedLength), stage: undefined })
              if (revealedLength < target) {
                scheduleReveal()
              }
            })
          }

          await askStream(
            question,
            {
              onMetadata: (meta) => {
                clearTimers()
                finalSources = meta.sources
                finalGraphContext = meta.graphContext
                safeUpdate({
                  stage: 'generating',
                  sources: meta.sources,
                  graphContext: meta.graphContext,
                  chunksRetrieved: meta.chunksRetrieved,
                })
              },
              onToken: (token) => {
                accumulated += token
                finalContent = accumulated
                scheduleReveal()
              },
              onCorrection: (
                sources,
                graphContext,
                impactAnalysis,
                businessRules,
                decisionTable,
                businessFlow,
                dataDictionary,
                technicalRules,
              ) => {
                finalSources = sources
                finalGraphContext = graphContext
                finalImpactAnalysis = impactAnalysis
                finalBusinessRules = businessRules
                finalDecisionTable = decisionTable
                finalBusinessFlow = businessFlow
                finalDataDictionary = dataDictionary
                finalTechnicalRules = technicalRules
                safeUpdate({
                  sources,
                  graphContext,
                  impactAnalysis,
                  businessRules,
                  decisionTable,
                  businessFlow,
                  dataDictionary,
                  technicalRules,
                })
              },
              onFollowups: (followUpQuestions) => {
                finalFollowUps = followUpQuestions
                safeUpdate({ followUpQuestions })
              },
              onBusinessRules: (rules) => {
                finalBusinessRules = rules
                safeUpdate({ businessRules: rules })
              },
              onDecisionTable: (rows) => {
                finalDecisionTable = rows
                safeUpdate({ decisionTable: rows })
              },
              onBusinessFlow: (flow) => {
                finalBusinessFlow = flow
                safeUpdate({ businessFlow: flow })
              },
              onDataDictionary: (entries) => {
                finalDataDictionary = entries
                safeUpdate({ dataDictionary: entries })
              },
              onTechnicalRules: (rules) => {
                finalTechnicalRules = rules
                safeUpdate({ technicalRules: rules })
              },
              onImpactAnalysis: (analysis) => {
                finalImpactAnalysis = analysis
                safeUpdate({ impactAnalysis: analysis })
              },
            },
            controller.signal,
          )
          // The stream finished — cancel any still-pending batched flush (its
          // content would already be stale) and commit the final text directly,
          // in the same update that flips isStreaming off.
          cancelPendingFlush()
          safeUpdate({ content: accumulated, isStreaming: false, stage: undefined })
          playReceiveSound()
        } else {
          timersRef.current.push(
            setTimeout(() => safeUpdate({ stage: 'retrieving' }), 700),
            setTimeout(() => safeUpdate({ stage: 'generating' }), 1800),
          )

          const response = await askComplete(question, controller.signal)
          clearTimers()
          finalContent = response.answer
          finalSources = response.sources
          finalGraphContext = response.graphContext
          finalFollowUps = response.followUpQuestions
          finalImpactAnalysis = response.impactAnalysis
          finalBusinessRules = response.businessRules
          finalDecisionTable = response.decisionTable
          finalBusinessFlow = response.businessFlow
          finalDataDictionary = response.dataDictionary
          finalTechnicalRules = response.technicalRules
          safeUpdate({
            content: response.answer,
            sources: response.sources,
            graphContext: response.graphContext,
            chunksRetrieved: response.chunksRetrieved,
            followUpQuestions: response.followUpQuestions,
            impactAnalysis: response.impactAnalysis,
            businessRules: response.businessRules,
            decisionTable: response.decisionTable,
            businessFlow: response.businessFlow,
            dataDictionary: response.dataDictionary,
            technicalRules: response.technicalRules,
            isStreaming: false,
            stage: undefined,
          })
          playReceiveSound()
        }
      } catch (err) {
        clearTimers()
        cancelPendingFlush()
        if ((err as Error).name === 'AbortError') {
          safeUpdate({ isStreaming: false, stage: undefined })
        } else {
          const message =
            err instanceof RagApiError
              ? err.message
              : 'Unable to reach the assistant. Please check the API is running on port 8083.'
          finalContent = message
          finalError = true
          safeUpdate({ content: message, isStreaming: false, stage: undefined, error: true })
        }
      } finally {
        // Only the CURRENT generation may clear busy/abort state — if this
        // invocation was superseded by a newer one for the same assistantId,
        // that newer one is still running and owns these; a stale invocation
        // finishing later must not flip isBusy to false out from under it.
        if (isCurrent()) {
          setBusy(false)
          abortRef.current = null
        }
      }

      // A superseded invocation's answer is stale by definition — skip
      // persisting it so it can never overwrite the current generation's
      // (possibly still in-flight, possibly already-saved) result in the DB.
      if (!isCurrent()) return

      const payload: StoredMessagePayload = {
        sources: finalSources,
        graphContext: finalGraphContext,
        followUpQuestions: finalFollowUps,
        error: finalError || undefined,
        impactAnalysis: finalImpactAnalysis,
        businessRules: finalBusinessRules,
        decisionTable: finalDecisionTable,
        businessFlow: finalBusinessFlow,
        dataDictionary: finalDataDictionary,
        technicalRules: finalTechnicalRules,
      }
      // Awaited so callers that need to re-sync with the server afterward (e.g.
      // branchFrom, to pick up sibling metadata) know the message has actually landed.
      await upsertMessage(conversationId, assistantId, 'assistant', finalContent, payload, assistantParentId)
    },
    [mode, updateMessage, setBusy, conversationId],
  )

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isBusyRef.current) return

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
    [runAsk, conversationId],
  )

  /** Starts an alternate follow-up from parentMessageId as a sibling of whatever
   * originally came next, leaving the current path untouched in the database. */
  const branchFrom = useCallback(
    async (parentMessageId: string, question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isBusyRef.current) return

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
    [runAsk, conversationId],
  )

  /** Switches the active path to run through messageId's branch (a sibling nav click). */
  const selectSibling = useCallback(
    async (messageId: string) => {
      if (isBusyRef.current) return
      try {
        const detail = await selectBranchApi(conversationId, messageId)
        setMessages(toMessages(detail))
      } catch {
        // Best-effort — leave the view as-is if the switch fails.
      }
    },
    [conversationId],
  )

  const regenerate = useCallback(
    async (assistantId: string) => {
      if (isBusyRef.current) return
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
        businessRules: undefined,
        decisionTable: undefined,
        businessFlow: undefined,
        dataDictionary: undefined,
        technicalRules: undefined,
      })
      await runAsk(target.sourceQuestion, assistantId, target.parentId ?? null)
    },
    [runAsk, updateMessage],
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
    if (isBusyRef.current) return
    try {
      const detail = await fetchConversation(id)
      setMessages(toMessages(detail))
      setConversationId(id)
    } catch {
      // Best-effort — if the conversation is gone (deleted/expired), do nothing.
    }
  }, [])

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

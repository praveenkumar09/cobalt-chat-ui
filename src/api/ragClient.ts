import type {
  AskResponse,
  SourceCitation,
  GraphRelationship,
  ImpactAnalysis,
  BusinessRule,
  DecisionTableRow,
  BusinessFlow,
  DataDictionaryEntry,
  TechnicalRule,
  ScenarioTrace,
  SseEvent,
  ConversationListResponse,
  ConversationDetail,
  StoredMessagePayload,
  ProgramSource,
  Role,
} from '../types'
import { getSessionToken } from '../utils/session'

const BASE_URL = (import.meta.env.VITE_RAG_API_BASE_URL as string | undefined) ?? 'http://localhost:8083'

export class RagApiError extends Error {}

function clientHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Session-Token': getSessionToken(), ...extra }
}

/** Best-effort — a persistence hiccup should never interrupt the live chat. */
export async function upsertMessage(
  conversationId: string,
  messageId: string,
  role: Role,
  content: string,
  payload: StoredMessagePayload | null,
  parentId: string | null = null,
  viewMode: string | null = null,
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PUT',
      headers: clientHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role, content, payload, parentId, viewMode }),
    })
  } catch {
    // Ignore — history persistence is not on the critical path of the chat.
  }
}

/** Switches the conversation's active path to run through messageId (a sibling switch). */
export async function selectBranch(conversationId: string, messageId: string): Promise<ConversationDetail> {
  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/select-branch`, {
    method: 'POST',
    headers: clientHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ messageId }),
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as ConversationDetail
}

export async function fetchConversations(
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<ConversationListResponse> {
  const res = await fetch(`${BASE_URL}/api/conversations?limit=${limit}&offset=${offset}`, {
    headers: clientHeaders(),
    signal,
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as ConversationListResponse
}

export async function fetchConversation(id: string, signal?: AbortSignal): Promise<ConversationDetail> {
  const res = await fetch(`${BASE_URL}/api/conversations/${id}`, {
    headers: clientHeaders(),
    signal,
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as ConversationDetail
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/conversations/${id}`, {
    method: 'DELETE',
    headers: clientHeaders(),
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
}

/** The program's real, ingested source (never fabricated) — 404 if none exists. */
export async function fetchProgramSource(programId: string, signal?: AbortSignal): Promise<ProgramSource> {
  const res = await fetch(`${BASE_URL}/api/programs/${encodeURIComponent(programId)}/source`, { signal })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as ProgramSource
}

/** LLM-generated proposed modification to the program, grounded in its real current source. */
export async function proposeChange(
  programId: string,
  question: string,
  answer: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/programs/${encodeURIComponent(programId)}/propose-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer }),
    signal,
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  const data = (await res.json()) as { proposedSource: string }
  return data.proposedSource
}

interface ProposeChangeStreamHandlers {
  onToken: (content: string) => void
  onError?: () => void
}

/** Streaming variant of {@link proposeChange} — used when the user's Live/Full
 * response-mode setting is "Live", same SSE shape as {@link askStream}. */
export async function proposeChangeStream(
  programId: string,
  question: string,
  answer: string,
  handlers: ProposeChangeStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/programs/${encodeURIComponent(programId)}/propose-change/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question, answer }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new RagApiError(`Streaming request failed with status ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) {
      const dataLines = rawEvent.split('\n').filter((line) => line.startsWith('data:'))
      if (dataLines.length === 0) continue

      const payload = dataLines.map((line) => line.slice(5).trimStart()).join('\n')
      if (payload === '[DONE]') return

      try {
        const parsed = JSON.parse(payload) as { type: string; content?: string }
        if (parsed.type === 'token' && parsed.content) {
          handlers.onToken(parsed.content)
        } else if (parsed.type === 'error') {
          handlers.onError?.()
        }
      } catch {
        // Ignore partial/malformed SSE frames — the buffer will complete on the next chunk.
      }
    }
  }
}

export async function fetchSuggestions(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/suggestions`, { signal })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  const data = (await res.json()) as { suggestions: string[] }
  return data.suggestions
}

export async function askComplete(
  question: string,
  viewMode: string,
  signal?: AbortSignal,
): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/api/ask/formal`, {
    method: 'POST',
    headers: clientHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ question, viewMode }),
    signal,
  })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as AskResponse
}

interface StreamHandlers {
  onMetadata: (meta: {
    sources: SourceCitation[]
    graphContext: GraphRelationship[]
    chunksRetrieved: number
  }) => void
  onToken: (content: string) => void
  onCorrection?: (
    sources: SourceCitation[],
    graphContext: GraphRelationship[],
    impactAnalysis: null,
    businessRules: BusinessRule[],
    decisionTable: DecisionTableRow[],
    businessFlow: null,
    dataDictionary: DataDictionaryEntry[],
    technicalRules: TechnicalRule[],
    scenarioTrace: null,
  ) => void
  onFollowups?: (questions: string[]) => void
  onBusinessRules?: (rules: BusinessRule[]) => void
  onDecisionTable?: (rows: DecisionTableRow[]) => void
  onBusinessFlow?: (flow: BusinessFlow) => void
  onDataDictionary?: (entries: DataDictionaryEntry[]) => void
  onTechnicalRules?: (rules: TechnicalRule[]) => void
  onImpactAnalysis?: (analysis: ImpactAnalysis) => void
  onScenarioTrace?: (trace: ScenarioTrace) => void
}

export async function askStream(
  question: string,
  viewMode: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: clientHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
    body: JSON.stringify({ question, viewMode }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new RagApiError(`Streaming request failed with status ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) {
      const dataLines = rawEvent.split('\n').filter((line) => line.startsWith('data:'))
      if (dataLines.length === 0) continue

      const payload = dataLines.map((line) => line.slice(5).trimStart()).join('\n')
      if (payload === '[DONE]') return

      try {
        const parsed = JSON.parse(payload) as SseEvent
        if (parsed.type === 'metadata') {
          handlers.onMetadata(parsed)
        } else if (parsed.type === 'token') {
          handlers.onToken(parsed.content)
        } else if (parsed.type === 'correction') {
          handlers.onCorrection?.(
            parsed.sources,
            parsed.graphContext,
            parsed.impactAnalysis,
            parsed.businessRules,
            parsed.decisionTable,
            parsed.businessFlow,
            parsed.dataDictionary,
            parsed.technicalRules,
            parsed.scenarioTrace,
          )
        } else if (parsed.type === 'followups') {
          handlers.onFollowups?.(parsed.questions)
        } else if (parsed.type === 'businessRules') {
          handlers.onBusinessRules?.(parsed.rules)
        } else if (parsed.type === 'decisionTable') {
          handlers.onDecisionTable?.(parsed.rows)
        } else if (parsed.type === 'businessFlow') {
          handlers.onBusinessFlow?.(parsed.flow)
        } else if (parsed.type === 'technicalRules') {
          handlers.onTechnicalRules?.(parsed.rules)
        } else if (parsed.type === 'dataDictionary') {
          handlers.onDataDictionary?.(parsed.entries)
        } else if (parsed.type === 'impactAnalysis') {
          handlers.onImpactAnalysis?.(parsed.analysis)
        } else if (parsed.type === 'scenarioTrace') {
          handlers.onScenarioTrace?.(parsed.trace)
        }
      } catch {
        // Ignore partial/malformed SSE frames — the buffer will complete on the next chunk.
      }
    }
  }
}

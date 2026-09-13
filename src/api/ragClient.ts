import type {
  AskResponse,
  SourceCitation,
  GraphRelationship,
  ImpactAnalysis,
  SseEvent,
  ConversationListResponse,
  ConversationDetail,
  StoredMessagePayload,
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
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PUT',
      headers: clientHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role, content, payload, parentId }),
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

export async function fetchSuggestions(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/suggestions`, { signal })
  if (!res.ok) {
    throw new RagApiError(`Request failed with status ${res.status}`)
  }
  const data = (await res.json()) as { suggestions: string[] }
  return data.suggestions
}

export async function askComplete(question: string, signal?: AbortSignal): Promise<AskResponse> {
  const res = await fetch(`${BASE_URL}/api/ask/formal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
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
    impactAnalysis?: ImpactAnalysis
  }) => void
  onToken: (content: string) => void
  onCorrection?: (sources: SourceCitation[], graphContext: GraphRelationship[], impactAnalysis: null) => void
  onFollowups?: (questions: string[]) => void
}

export async function askStream(question: string, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question }),
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
          handlers.onCorrection?.(parsed.sources, parsed.graphContext, parsed.impactAnalysis)
        } else if (parsed.type === 'followups') {
          handlers.onFollowups?.(parsed.questions)
        }
      } catch {
        // Ignore partial/malformed SSE frames — the buffer will complete on the next chunk.
      }
    }
  }
}

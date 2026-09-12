import type { AskResponse, SseEvent } from '../types'

const BASE_URL = (import.meta.env.VITE_RAG_API_BASE_URL as string | undefined) ?? 'http://localhost:8083'

export class RagApiError extends Error {}

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
  onMetadata: (meta: { sources: string[]; graphContext: string[]; chunksRetrieved: number }) => void
  onToken: (content: string) => void
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
        }
      } catch {
        // Ignore partial/malformed SSE frames — the buffer will complete on the next chunk.
      }
    }
  }
}

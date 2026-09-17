import type { FeedbackStats } from '../types'
import { getSessionToken } from '../utils/session'

const BASE_URL = (import.meta.env.VITE_RAG_API_BASE_URL as string | undefined) ?? 'http://localhost:8083'

export class FeedbackApiError extends Error {}

function clientHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Session-Token': getSessionToken(), ...extra }
}

export async function submitFeedback(question: string | undefined, answer: string, message: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: clientHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ question: question ?? null, answer, message }),
  })
  if (!res.ok) {
    throw new FeedbackApiError(`Request failed with status ${res.status}`)
  }
}

export async function getFeedbackStats(limit = 10, offset = 0): Promise<FeedbackStats> {
  const res = await fetch(`${BASE_URL}/api/admin/feedback/stats?limit=${limit}&offset=${offset}`, {
    headers: clientHeaders(),
  })
  if (!res.ok) {
    throw new FeedbackApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as FeedbackStats
}

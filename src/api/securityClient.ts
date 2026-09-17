import type { SecurityStats } from '../types'
import { getSessionToken } from '../utils/session'

const BASE_URL = (import.meta.env.VITE_RAG_API_BASE_URL as string | undefined) ?? 'http://localhost:8083'

export class SecurityApiError extends Error {}

function clientHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Session-Token': getSessionToken(), ...extra }
}

export async function getSecurityStats(limit = 50): Promise<SecurityStats> {
  const res = await fetch(`${BASE_URL}/api/admin/security/stats?limit=${limit}`, {
    headers: clientHeaders(),
  })
  if (!res.ok) {
    throw new SecurityApiError(`Request failed with status ${res.status}`)
  }
  return (await res.json()) as SecurityStats
}

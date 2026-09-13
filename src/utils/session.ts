const STORAGE_KEY = 'aia-orbit-session'

interface StoredSession {
  token: string
  email: string
}

function read(): StoredSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    return parsed.token && parsed.email ? (parsed as StoredSession) : null
  } catch {
    return null
  }
}

/** Used by ragClient.ts to attach X-Session-Token without needing the token threaded through props. */
export function getSessionToken(): string {
  return read()?.token ?? ''
}

export function getStoredSession(): StoredSession | null {
  return read()
}

export function setSession(token: string, email: string): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, email }))
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

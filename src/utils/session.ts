const STORAGE_KEY = 'aia-orbit-session'

interface StoredSession {
  token: string
  email: string
}

// sessionStorage (not localStorage): the token must not outlive the browser
// tab/window — closing it should require signing in again next time, rather
// than silently resuming a session that's still valid server-side.
function read(): StoredSession | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
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
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, email }))
}

export function clearSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEY)
}

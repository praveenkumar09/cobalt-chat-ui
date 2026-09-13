import { useCallback, useEffect, useState } from 'react'
import { me as fetchMe, logout as apiLogout } from '../api/authClient'
import { getStoredSession, setSession as persistSession, clearSession } from '../utils/session'

export interface Session {
  token: string
  email: string
}

export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const stored = getStoredSession()
    if (!stored) {
      setVerifying(false)
      return
    }
    fetchMe(stored.token)
      .then((result) => {
        if (result) {
          setSessionState(stored)
        } else {
          clearSession()
        }
      })
      .finally(() => setVerifying(false))
  }, [])

  const login = useCallback((token: string, email: string) => {
    persistSession(token, email)
    setSessionState({ token, email })
  }, [])

  const logout = useCallback(() => {
    if (session) {
      apiLogout(session.token)
    }
    clearSession()
    setSessionState(null)
  }, [session])

  return { session, verifying, login, logout }
}

const BASE_URL = (import.meta.env.VITE_RAG_API_BASE_URL as string | undefined) ?? 'http://localhost:8083'

export class AuthApiError extends Error {}

export interface AuthSuccess {
  token: string
  email: string
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export async function signup(email: string, password: string): Promise<AuthSuccess> {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new AuthApiError(await parseErrorMessage(res, 'Unable to sign up'))
  }
  return (await res.json()) as AuthSuccess
}

export async function login(email: string, password: string): Promise<AuthSuccess> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new AuthApiError(await parseErrorMessage(res, 'Invalid email or password'))
  }
  return (await res.json()) as AuthSuccess
}

export async function resetPassword(email: string, newPassword: string, confirmPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword, confirmPassword }),
  })
  if (!res.ok) {
    throw new AuthApiError(await parseErrorMessage(res, 'Unable to reset password'))
  }
}

export async function me(token: string): Promise<{ email: string } | null> {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'X-Session-Token': token },
  })
  if (!res.ok) return null
  return (await res.json()) as { email: string }
}

export async function logout(token: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'X-Session-Token': token },
    })
  } catch {
    // Best-effort — the client clears its local session regardless.
  }
}

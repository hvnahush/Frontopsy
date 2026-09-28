const API_URL = import.meta.env.VITE_API_URL ?? ''

export type AuthProvider = 'email' | 'google'

export interface User {
  id: string
  name: string
  email: string
  provider: AuthProvider
  avatar?: string
}

export interface Credentials {
  email: string
  password: string
}

export interface SignupDetails extends Credentials {
  name: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }

  if (response.status === 204) return undefined as T

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? 'Something went wrong.')
  }
  return body as T
}

function post<T>(path: string, data?: unknown) {
  return request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) })
}

export async function registerUser(details: SignupDetails): Promise<User> {
  const { user } = await post<{ user: User }>('/auth/signup', details)
  return user
}

export async function authenticateUser(credentials: Credentials): Promise<User> {
  const { user } = await post<{ user: User }>('/auth/login', credentials)
  return user
}

export async function authenticateWithGoogle(accessToken: string): Promise<User> {
  const { user } = await post<{ user: User }>('/auth/google', { accessToken })
  return user
}

export async function fetchSessionUser(): Promise<User | null> {
  const { user } = await request<{ user: User | null }>('/auth/me')
  return user
}

export async function endSession(): Promise<void> {
  await post<void>('/auth/logout')
}

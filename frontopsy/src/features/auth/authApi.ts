import { post, request } from '../../app/apiClient'

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

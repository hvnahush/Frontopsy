const USERS_KEY = 'frontopsy_users'
const SESSION_KEY = 'frontopsy_session'

export type AuthProvider = 'email' | 'google'

export interface User {
  name: string
  email: string
  provider: AuthProvider
  avatar?: string
}

interface StoredUser extends User {
  passwordHash?: string
}

export interface Credentials {
  email: string
  password: string
}

export interface SignupDetails extends Credentials {
  name: string
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? 'null') ?? []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export async function registerUser({ name, email, password }: SignupDetails): Promise<User> {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.')
  }

  const passwordHash = await hashPassword(password)
  const user: StoredUser = { name, email: normalizedEmail, passwordHash, provider: 'email' }
  writeUsers([...users, user])

  return { name: user.name, email: user.email, provider: user.provider }
}

export async function authenticateUser({ email, password }: Credentials): Promise<User> {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const passwordHash = await hashPassword(password)

  const user = users.find(
    (u) => u.email === normalizedEmail && u.passwordHash === passwordHash,
  )

  if (!user) {
    throw new Error('Invalid email or password.')
  }

  return { name: user.name, email: user.email, provider: user.provider }
}

export function upsertOAuthUser({ name, email, provider, avatar }: User): User {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const existing = users.find((u) => u.email === normalizedEmail)

  if (!existing) {
    writeUsers([...users, { name, email: normalizedEmail, provider, avatar }])
  }

  return { name, email: normalizedEmail, provider, avatar }
}

export function saveSession(user: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function readSession(): User | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

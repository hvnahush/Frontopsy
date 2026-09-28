const USERS_KEY = 'frontopsy_users'
const SESSION_KEY = 'frontopsy_session'

async function hashPassword(password) {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) ?? []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export async function registerUser({ name, email, password }) {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.')
  }

  const passwordHash = await hashPassword(password)
  const user = { name, email: normalizedEmail, passwordHash, provider: 'email' }
  writeUsers([...users, user])

  return { name: user.name, email: user.email, provider: user.provider }
}

export async function authenticateUser({ email, password }) {
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

export function upsertOAuthUser({ name, email, provider, avatar }) {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const existing = users.find((u) => u.email === normalizedEmail)

  if (!existing) {
    writeUsers([...users, { name, email: normalizedEmail, provider, avatar }])
  }

  return { name, email: normalizedEmail, provider, avatar }
}

export function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

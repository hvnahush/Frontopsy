import { pool } from '../db/pool.js'
import { HttpError } from '../httpError.js'

export type AuthProvider = 'email' | 'google'

interface UserRow {
  id: string
  name: string
  email: string
  password_hash: string | null
  provider: AuthProvider
  avatar_url: string | null
}

export interface User {
  id: string
  name: string
  email: string
  provider: AuthProvider
  avatar?: string
}

export interface UserWithPassword extends User {
  passwordHash: string | null
}

const UNIQUE_VIOLATION = '23505'
const USER_COLUMNS = 'id, name, email, password_hash, provider, avatar_url'

function toUser(row: UserRow): UserWithPassword {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    provider: row.provider,
    ...(row.avatar_url ? { avatar: row.avatar_url } : {}),
    passwordHash: row.password_hash,
  }
}

export function toPublicUser({ passwordHash: _passwordHash, ...user }: UserWithPassword): User {
  return user
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const { rows } = await pool.query<UserRow>(`select ${USER_COLUMNS} from users where email = $1`, [email])
  return rows[0] ? toUser(rows[0]) : null
}

export async function findUserById(id: string): Promise<UserWithPassword | null> {
  const { rows } = await pool.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id])
  return rows[0] ? toUser(rows[0]) : null
}

export async function createEmailUser(details: {
  name: string
  email: string
  passwordHash: string
}): Promise<UserWithPassword> {
  try {
    const { rows } = await pool.query<UserRow>(
      `insert into users (name, email, password_hash, provider)
       values ($1, $2, $3, 'email')
       returning ${USER_COLUMNS}`,
      [details.name, details.email, details.passwordHash],
    )
    return toUser(rows[0]!)
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'An account with this email already exists.')
    }
    throw error
  }
}

// Google has verified the email, so an existing account with that email is
// signed into rather than duplicated.
export async function upsertGoogleUser(details: {
  name: string
  email: string
  avatar?: string
}): Promise<UserWithPassword> {
  const { rows } = await pool.query<UserRow>(
    `insert into users (name, email, provider, avatar_url)
     values ($1, $2, 'google', $3)
     on conflict (email) do update
       set avatar_url = coalesce(users.avatar_url, excluded.avatar_url),
           updated_at = now()
     returning ${USER_COLUMNS}`,
    [details.name, details.email, details.avatar ?? null],
  )
  return toUser(rows[0]!)
}

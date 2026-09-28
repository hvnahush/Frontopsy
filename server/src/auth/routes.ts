import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { HttpError } from '../httpError.js'
import { verifyGoogleAccessToken } from './google.js'
import { endSession, readSessionUserId, startSession } from './session.js'
import { createEmailUser, findUserByEmail, findUserById, toPublicUser, upsertGoogleUser } from './users.js'

const BCRYPT_ROUNDS = 12
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('frontopsy-dummy-password', BCRYPT_ROUNDS)

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'))

const signupSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(100, 'That name is too long.'),
  email: emailSchema,
  // bcrypt only uses the first 72 bytes of a password.
  password: z.string().min(6, 'Password needs at least 6 characters.').max(72, 'Password is too long.'),
})

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
})

const googleSchema = z.object({
  accessToken: z.string().min(1),
})

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request.')
  }
  return result.data
}

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
})

export const authRouter = Router()

authRouter.post('/signup', credentialLimiter, async (req, res) => {
  const { name, email, password } = parseBody(signupSchema, req.body)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await createEmailUser({ name, email, passwordHash })

  startSession(res, user.id)
  res.status(201).json({ user: toPublicUser(user) })
})

authRouter.post('/login', credentialLimiter, async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body)
  const user = await findUserByEmail(email)
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  if (!user?.passwordHash || !passwordMatches) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  startSession(res, user.id)
  res.json({ user: toPublicUser(user) })
})

authRouter.post('/google', credentialLimiter, async (req, res) => {
  const { accessToken } = parseBody(googleSchema, req.body)
  const profile = await verifyGoogleAccessToken(accessToken)
  const user = await upsertGoogleUser(profile)

  startSession(res, user.id)
  res.json({ user: toPublicUser(user) })
})

authRouter.post('/logout', (_req, res) => {
  endSession(res)
  res.status(204).end()
})

// Being logged out is a normal answer here, not an error, so it returns 200 with a null user.
authRouter.get('/me', async (req, res) => {
  const userId = readSessionUserId(req)
  const user = userId ? await findUserById(userId) : null

  if (userId && !user) endSession(res)
  res.json({ user: user ? toPublicUser(user) : null })
})

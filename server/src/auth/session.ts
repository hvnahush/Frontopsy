import type { Request, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config, isProduction } from '../config.js'
import { HttpError } from '../httpError.js'

const COOKIE_NAME = 'frontopsy_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
} as const

export function startSession(res: Response, userId: string) {
  const token = jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  })
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 })
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions)
}

export function readSessionUserId(req: Request): string | null {
  const token: unknown = req.cookies?.[COOKIE_NAME]
  if (typeof token !== 'string') return null

  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] })
    return typeof payload === 'object' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = readSessionUserId(req)
  if (!userId) throw new HttpError(401, 'You need to log in.')
  res.locals.userId = userId
  next()
}

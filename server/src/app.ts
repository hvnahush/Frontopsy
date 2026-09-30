import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler } from 'express'
import { authRouter } from './auth/routes.js'
import { config } from './config.js'
import { checkupsRouter } from './checkups/routes.js'
import { pool } from './db/pool.js'
import { HttpError } from './httpError.js'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', config.TRUST_PROXY_HOPS)
// Starting a checkup can carry a screenshot as base64 (see MAX_IMAGE_BYTES in
// checkups/screenshotCheckup.ts); everything else stays small.
app.post('/api/checkups', express.json({ limit: '15mb' }))
app.use(express.json({ limit: '200kb' }))
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  await pool.query('select 1')
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/checkups', checkupsRouter)

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Not found.'))
})

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  // Malformed JSON bodies and other errors raised by body-parser.
  if (typeof error?.status === 'number' && error.status < 500 && error.expose) {
    res.status(error.status).json({ error: 'Invalid request.' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

app.use(errorHandler)

import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { readSessionUserId, requireAuth } from '../auth/session.js'
import { HttpError } from '../httpError.js'
import { MAX_CODE_LENGTH } from './codeCheckup.js'
import { CheckupFailure } from './errors.js'
import { isGeminiConfigured } from './gemini.js'
import { enqueueCheckup, isQueueFull } from './queue.js'
import {
  countActiveCheckups,
  createCheckup,
  deleteCheckup,
  findCheckup,
  findScreenshot,
  listCheckups,
  type Checkup,
  type NewCheckup,
} from './repository.js'
import { MAX_IMAGE_BYTES, parseScreenshot } from './screenshotCheckup.js'
import { parseCheckupUrl } from './urlSafety.js'

const startSchema = z.union([
  z.object({ url: z.string().max(2048) }),
  z.object({
    code: z.string().max(MAX_CODE_LENGTH, 'That’s a lot of code. Paste just the page or component that’s acting up.'),
    symptoms: z.array(z.string().max(40)).max(10).default([]),
  }),
  z.object({
    // A data URL; base64 makes it about a third bigger than the file.
    screenshot: z.string().max(Math.ceil(MAX_IMAGE_BYTES * 1.4), 'Screenshots need to be under 10 MB.'),
    symptoms: z.array(z.string().max(40)).max(10).default([]),
  }),
])

const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (_req, res) => res.locals.userId as string,
  message: { error: 'You’ve run a lot of checkups this hour. Take a breather and try again soon.' },
})

/** What the API exposes: never the owner's id, and pasted code only to its owner. */
function present(checkup: Checkup, viewerId: string | null) {
  const { userId, code, ...rest } = checkup
  const isOwner = viewerId === userId
  return { ...rest, code: isOwner ? code : null, isOwner }
}

export const checkupsRouter = Router()

checkupsRouter.post('/', requireAuth, startLimiter, async (req, res) => {
  const body = startSchema.safeParse(req.body)
  if (!body.success) {
    const tooBig = body.error.issues.find((issue) => issue.code === 'too_big')
    throw new HttpError(400, tooBig?.message ?? 'Paste a link, like https://yourwebsite.com, some code, or a screenshot.')
  }

  const userId = res.locals.userId as string
  let input: NewCheckup
  if ('url' in body.data) {
    input = { source: 'url', url: (await parseCheckupUrl(body.data.url)).href }
  } else if (!isGeminiConfigured()) {
    throw new HttpError(503, 'AI checkups aren’t set up on this server yet.')
  } else if ('code' in body.data) {
    const code = body.data.code.trim()
    if (code.length < 10) throw new HttpError(400, 'Paste a bit more code so there’s something to check.')
    input = { source: 'code', code, symptoms: body.data.symptoms }
  } else {
    try {
      input = { source: 'screenshot', image: parseScreenshot(body.data.screenshot), symptoms: body.data.symptoms }
    } catch (error) {
      if (error instanceof CheckupFailure) throw new HttpError(400, error.message)
      throw error
    }
  }

  if ((await countActiveCheckups(userId)) > 0) {
    throw new HttpError(429, 'You already have a checkup running. Wait for it to finish first.')
  }
  if (isQueueFull()) throw new HttpError(503, 'We’re checking a lot of sites right now. Try again in a minute.')

  const checkup = await createCheckup(userId, input)
  enqueueCheckup({ id: checkup.id, ...input })
  res.status(202).json({ checkup: present(checkup, userId) })
})

checkupsRouter.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string
  const checkups = await listCheckups(userId)
  res.json({ checkups: checkups.map((checkup) => present(checkup, userId)) })
})

// Reports are shareable: anyone with the (unguessable) link can view one.
checkupsRouter.get('/:id', async (req, res) => {
  const checkup = await findCheckup(req.params.id)
  if (!checkup) throw new HttpError(404, 'That checkup doesn’t exist, or it was deleted.')
  res.json({ checkup: present(checkup, readSessionUserId(req)) })
})

checkupsRouter.get('/:id/screenshots/:device', async (req, res) => {
  const device = req.params.device
  if (device !== 'phone' && device !== 'laptop') throw new HttpError(404, 'Not found.')
  const image = await findScreenshot(req.params.id, device)
  if (!image) throw new HttpError(404, 'Not found.')
  // Our own screenshots are JPEG; uploaded ones can also be PNG or WebP.
  const type = image[0] === 0x89 ? 'image/png' : image.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : 'image/jpeg'
  res.set('Cache-Control', 'private, max-age=86400').type(type).send(image)
})

checkupsRouter.delete('/:id', requireAuth, async (req, res) => {
  const deleted = await deleteCheckup(String(req.params.id), res.locals.userId as string)
  if (!deleted) throw new HttpError(404, 'That checkup doesn’t exist, or it was deleted.')
  res.status(204).end()
})

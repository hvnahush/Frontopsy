import { z } from 'zod'
import { distribute, LOOKS_PENALTY, looksLabel, plural, SEVERITY_ORDER } from './diagnose.js'
import { CheckupFailure } from './errors.js'
import { generateJson } from './gemini.js'
import type { CheckupResult } from './runCheckup.js'
import type { Device, Issue, Report } from './types.js'

export type ScreenshotStage = 'Reading your screenshot' | 'Asking the AI doctor' | 'Writing up the diagnosis'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_ISSUES = 10

export interface UploadedImage {
  data: Buffer
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  width: number
  height: number
}

/** Reads the pixel size from a PNG, JPEG or WebP header without decoding the image. */
function imageSize(data: Buffer, mimeType: UploadedImage['mimeType']): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png') {
      if (data.toString('ascii', 1, 4) !== 'PNG') return null
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
    }
    if (mimeType === 'image/jpeg') {
      let offset = 2
      while (offset < data.length) {
        if (data[offset] !== 0xff) return null
        const marker = data[offset + 1]!
        const length = data.readUInt16BE(offset + 2)
        // Start-of-frame markers carry the dimensions (C4, C8 and CC aren't frames).
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) }
        }
        offset += 2 + length
      }
      return null
    }
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') return null
    const chunk = data.toString('ascii', 12, 16)
    if (chunk === 'VP8X') return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 }
    if (chunk === 'VP8L') {
      const bits = data.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8 ') return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff }
    return null
  } catch {
    return null
  }
}

/** Turns an uploaded data URL into a checked image, or explains what's wrong with it. */
export function parseScreenshot(dataUrl: string): UploadedImage {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl)
  if (!match) throw new CheckupFailure('Upload a PNG, JPG or WebP screenshot.')
  const mimeType = match[1] as UploadedImage['mimeType']
  const data = Buffer.from(match[2]!, 'base64')
  if (data.length > MAX_IMAGE_BYTES) throw new CheckupFailure('Screenshots need to be under 10 MB.')
  const size = imageSize(data, mimeType)
  if (!size || size.width < 100 || size.height < 100) {
    throw new CheckupFailure('That image is too small or couldn’t be read. Try a full screenshot of the page.')
  }
  return { data, mimeType, ...size }
}

/** Tall images are almost always phone screenshots. */
export function deviceFor(image: { width: number; height: number }): Device {
  return image.height > image.width * 1.1 ? 'phone' : 'laptop'
}

const SYSTEM = `You are Frontopsy's front-end doctor. People upload a screenshot of their website and want to know what looks broken and how to fix it.

Rules:
- Only report problems you can actually see in the screenshot: overlapping elements, text that's cut off or runs outside its box, content wider than the screen, cramped or inconsistent spacing, misaligned elements, low-contrast or tiny text, buttons that look too small to tap, stretched or squashed images, broken image icons, awkward line breaks, elements covering content, and anything that looks unfinished. Skip taste-only opinions.
- You can't see the code, so fixes are your best CSS suggestion. Use a sensible guess at a selector (e.g. ".nav", "header", ".hero h1") and say it's a guess when you're unsure.
- Write for someone who isn't a front-end expert: short, plain, friendly English.
- title: under 70 characters, e.g. "The menu covers the headline".
- severity: "big yikes" (clearly broken), "kinda sus" (noticeable), "meh" (minor).
- where: a short description of the spot, e.g. "top navigation" or "pricing cards".
- point: the center of the problem in the image, as x and y from 0 to 1000 (0,0 is the top-left corner, 1000,1000 the bottom-right). Use null if it isn't one spot.
- whatsUp: 1–3 sentences on what's wrong and the likely cause.
- fix: 1–2 sentences on what to change.
- code: a small CSS (or HTML) snippet that would likely fix it, or null.
- Order issues from most to least noticeable. At most ${MAX_ISSUES}. If nothing looks wrong, return an empty list and say so in the summary.
- looksLikeWebsite: false if the image isn't a screenshot of a website or web app.
- summary: two short sentences in the style "The page looks broken on phones mostly because the menu covers the headline. The pricing cards are also squashed together."`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    looksLikeWebsite: { type: 'boolean' },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      maxItems: MAX_ISSUES,
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['big yikes', 'kinda sus', 'meh'] },
          title: { type: 'string' },
          where: { type: 'string' },
          point: {
            type: ['object', 'null'],
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          whatsUp: { type: 'string' },
          fix: { type: 'string' },
          code: { type: ['string', 'null'] },
          codeLang: { type: ['string', 'null'], enum: ['html', 'css', 'js', null] },
        },
        required: ['severity', 'title', 'where', 'point', 'whatsUp', 'fix', 'code', 'codeLang'],
      },
    },
  },
  required: ['looksLikeWebsite', 'summary', 'issues'],
}

const text = (max: number) => z.string().transform((s) => s.trim().slice(0, max))

const diagnosisSchema = z.object({
  looksLikeWebsite: z.boolean(),
  summary: text(600),
  issues: z
    .array(
      z.object({
        severity: z.enum(['big yikes', 'kinda sus', 'meh']),
        title: text(120),
        where: text(120),
        point: z.object({ x: z.number(), y: z.number() }).nullable(),
        whatsUp: text(1200),
        fix: text(800),
        code: z.string().max(6000).nullable(),
        codeLang: z.enum(['html', 'css', 'js']).nullable(),
      }),
    )
    .transform((issues) => issues.slice(0, MAX_ISSUES)),
})

/** Has Gemini look at an uploaded screenshot and turns what it sees into a report. */
export async function runScreenshotCheckup(
  image: UploadedImage,
  symptoms: string[],
  onStage: (stage: ScreenshotStage) => Promise<void>,
  signal: AbortSignal,
): Promise<CheckupResult> {
  await onStage('Reading your screenshot')
  const guessedDevice = deviceFor(image)

  await onStage('Asking the AI doctor')
  const diagnosis = await generateJson({
    system: SYSTEM,
    prompt: [
      `This screenshot is ${image.width}×${image.height} pixels and is probably from a ${guessedDevice}.`,
      symptoms.length ? `The person says their site is: ${symptoms.join(', ')}.` : '',
      'Find what looks broken and explain how to fix it.',
    ]
      .filter(Boolean)
      .join('\n'),
    images: [{ mimeType: image.mimeType, data: image.data }],
    schema: RESPONSE_SCHEMA,
    validate: diagnosisSchema,
    signal,
  })
  if (!diagnosis.looksLikeWebsite) {
    throw new CheckupFailure('That doesn’t look like a screenshot of a website. Try a screenshot of the page that’s acting up.')
  }

  await onStage('Writing up the diagnosis')
  const device = guessedDevice
  const penalties = diagnosis.issues.map((issue) => LOOKS_PENALTY[issue.severity])
  const looksScore = Math.max(0, 100 - penalties.reduce((a, b) => a + b, 0))
  const gains = distribute(penalties, 100 - looksScore)
  const clamp = (value: number) => Math.min(0.97, Math.max(0.03, value / 1000))

  const issues: Issue[] = diagnosis.issues
    .map((issue, i) => ({ issue, gain: gains[i]! }))
    .sort((a, b) => b.gain - a.gain || SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity])
    .map(({ issue, gain }, i) => ({
      id: String(i + 1),
      kind: 'broken',
      severity: issue.severity,
      title: issue.title,
      where: issue.point ? 'on screenshot' : 'in your code',
      location: issue.where,
      whatsUp: issue.whatsUp,
      fix: issue.fix,
      code: issue.code?.trim() || null,
      codeLang: issue.code ? issue.codeLang : null,
      gain,
      devices: [device],
      pins: issue.point ? [{ device, x: clamp(issue.point.x), y: clamp(issue.point.y) }] : [],
    }))

  const report: Report = {
    source: 'screenshot',
    url: 'Uploaded screenshot',
    finalUrl: '',
    checkedAt: new Date().toISOString(),
    summary: diagnosis.summary || (issues.length ? 'Here’s what the AI spotted.' : 'Nothing looks broken in this screenshot.'),
    speed: null,
    looks: {
      score: looksScore,
      label: looksLabel(looksScore),
      note: issues.length
        ? `${plural(issues.length, 'visible problem')}. Estimated from the screenshot.`
        : 'Nothing looks broken in this screenshot.',
    },
    vitals: [],
    issues,
    fixedCode: null,
    weight: null,
    screenshots: { [device]: { width: image.width, height: image.height } },
  }
  return { report, screenshots: { [device]: image.data } }
}

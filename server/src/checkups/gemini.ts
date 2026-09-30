import { z } from 'zod'
import { config } from '../config.js'
import { CheckupFailure } from './errors.js'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const REQUEST_TIMEOUT_MS = 75_000
// Worth trying the next model on: busy, rate-limited, retired or briefly broken.
const FALLBACK_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504])

export function isGeminiConfigured() {
  return Boolean(config.GEMINI_API_KEY)
}

function models() {
  return config.GEMINI_MODELS.split(',')
    .map((m) => m.trim())
    .filter(Boolean)
}

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { code?: number; message?: string }
}

/**
 * Asks Gemini for JSON matching `schema`, trying each configured model in turn when
 * one is overloaded or unavailable. `validate` checks the parsed JSON.
 */
export async function generateJson<T>(options: {
  system: string
  prompt: string
  /** Images sent alongside the prompt, e.g. an uploaded screenshot. */
  images?: { mimeType: string; data: Buffer }[]
  schema: Record<string, unknown>
  validate: z.ZodType<T>
  signal: AbortSignal
}): Promise<T> {
  if (!config.GEMINI_API_KEY) throw new CheckupFailure('Code checkups aren’t set up on this server yet.')

  const problems: string[] = []
  for (const model of models()) {
    if (options.signal.aborted) break
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal: AbortSignal.any([options.signal, timeout]),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.system }] },
          contents: [
            {
              role: 'user',
              parts: [
                ...(options.images ?? []).map((image) => ({
                  inlineData: { mimeType: image.mimeType, data: image.data.toString('base64') },
                })),
                { text: options.prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 24_000,
            responseMimeType: 'application/json',
            responseJsonSchema: options.schema,
          },
        }),
      })
    } catch (error) {
      if (options.signal.aborted) break
      problems.push(`${model}: ${timeout.aborted ? 'timed out' : String(error)}`)
      continue
    }

    const body = (await response.json().catch(() => ({}))) as GenerateResponse
    if (!response.ok) {
      problems.push(`${model}: HTTP ${response.status} ${body.error?.message?.slice(0, 160) ?? ''}`)
      if (FALLBACK_STATUSES.has(response.status)) continue
      break
    }

    if (body.promptFeedback?.blockReason) {
      throw new CheckupFailure('The AI refused to look at that. Try a different screenshot or just the part of the code that’s broken.')
    }
    const text = body.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
    try {
      const parsed = options.validate.safeParse(JSON.parse(text))
      if (parsed.success) {
        if (problems.length) console.warn(`Gemini fell back to ${model} after:\n  ${problems.join('\n  ')}`)
        return parsed.data
      }
      problems.push(`${model}: response didn't match the schema (${parsed.error.issues[0]?.message})`)
    } catch {
      problems.push(`${model}: response wasn't JSON (finish reason ${body.candidates?.[0]?.finishReason ?? 'unknown'})`)
    }
  }

  if (!options.signal.aborted) console.error('Gemini failed on every model:\n  ' + problems.join('\n  '))
  throw new CheckupFailure('The AI doctor is swamped right now. Try again in a minute.')
}

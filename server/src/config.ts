import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ quiet: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Google Gemini diagnoses pasted code. Without a key, code checkups are turned off.
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Comma-separated models to try in order; later ones are fallbacks when earlier ones are busy.
  GEMINI_MODELS: z.string().default('gemini-3.8-flash,gemini-flash-latest,gemini-3-flash-preview,gemini-3.1-flash-lite'),
  // Lets checkups load localhost and private-network sites. Handy for testing your own dev server,
  // but it must stay off anywhere the public can start checkups.
  CHECKUP_ALLOW_PRIVATE_URLS: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
  console.error(`Invalid environment configuration:\n${problems.join('\n')}`)
  process.exit(1)
}

export const isProduction = parsed.data.NODE_ENV === 'production'
export const config = {
  ...parsed.data,
  CHECKUP_ALLOW_PRIVATE_URLS: parsed.data.CHECKUP_ALLOW_PRIVATE_URLS ?? !isProduction,
}

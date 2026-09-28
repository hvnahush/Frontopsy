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
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
  console.error(`Invalid environment configuration:\n${problems.join('\n')}`)
  process.exit(1)
}

export const config = parsed.data
export const isProduction = config.NODE_ENV === 'production'

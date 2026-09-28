import pg from 'pg'
import { config } from '../config.js'

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  // Supabase requires TLS; its certificate isn't in Node's default CA bundle.
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
})

pool.on('error', (error) => {
  console.error('Unexpected Postgres pool error', error)
})

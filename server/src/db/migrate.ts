import { readFile } from 'node:fs/promises'
import { pool } from './pool.js'

const schemaUrl = new URL('../../db/schema.sql', import.meta.url)

try {
  const sql = await readFile(schemaUrl, 'utf8')
  await pool.query(sql)
  console.log('Database schema is up to date.')
} catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}

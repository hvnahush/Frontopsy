import { pool } from '../db/pool.js'
import { deviceFor, type UploadedImage } from './screenshotCheckup.js'
import type { CheckupSource, Device, Report } from './types.js'

export type CheckupStatus = 'queued' | 'running' | 'done' | 'failed'

interface CheckupRow {
  id: string
  user_id: string
  source: CheckupSource
  url: string
  code: string | null
  symptoms: string[]
  status: CheckupStatus
  stage: string | null
  error: string | null
  report: Report | null
  created_at: Date
  finished_at: Date | null
}

export interface Checkup {
  id: string
  userId: string
  source: CheckupSource
  url: string
  code: string | null
  symptoms: string[]
  status: CheckupStatus
  stage: string | null
  error: string | null
  report: Report | null
  createdAt: string
  finishedAt: string | null
}

const COLUMNS = 'id, user_id, source, url, code, symptoms, status, stage, error, report, created_at, finished_at'

function toCheckup(row: CheckupRow): Checkup {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    url: row.url,
    code: row.code,
    symptoms: row.symptoms,
    status: row.status,
    stage: row.stage,
    error: row.error,
    report: row.report,
    createdAt: row.created_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type NewCheckup =
  | { source: 'url'; url: string }
  | { source: 'code'; code: string; symptoms: string[] }
  | { source: 'screenshot'; image: UploadedImage; symptoms: string[] }

export async function createCheckup(userId: string, input: NewCheckup): Promise<Checkup> {
  const values =
    input.source === 'url'
      ? [userId, 'url', input.url, null, [], null, null]
      : input.source === 'code'
        ? [userId, 'code', 'Pasted code', input.code, input.symptoms, null, null]
        : [
            userId,
            'screenshot',
            'Uploaded screenshot',
            null,
            input.symptoms,
            // The upload doubles as the report's screenshot, filed under the device it looks like.
            deviceFor(input.image) === 'phone' ? input.image.data : null,
            deviceFor(input.image) === 'laptop' ? input.image.data : null,
          ]
  const { rows } = await pool.query<CheckupRow>(
    `insert into checkups (user_id, source, url, code, symptoms, phone_screenshot, laptop_screenshot)
     values ($1, $2, $3, $4, $5, $6, $7) returning ${COLUMNS}`,
    values,
  )
  return toCheckup(rows[0]!)
}

export async function findCheckup(id: string): Promise<Checkup | null> {
  if (!UUID.test(id)) return null
  const { rows } = await pool.query<CheckupRow>(`select ${COLUMNS} from checkups where id = $1`, [id])
  return rows[0] ? toCheckup(rows[0]) : null
}

/** Recent checkups without their (large) reports, for the history list. */
export async function listCheckups(userId: string) {
  const { rows } = await pool.query<CheckupRow & { speed: number | null; looks: number | null }>(
    `select ${COLUMNS.replace('report', 'null as report').replace('code', 'null as code')},
            (report -> 'speed' ->> 'score')::int as speed,
            (report -> 'looks' ->> 'score')::int as looks
       from checkups where user_id = $1 order by created_at desc limit 30`,
    [userId],
  )
  return rows.map((row) => ({ ...toCheckup(row), speed: row.speed, looks: row.looks }))
}

export async function countActiveCheckups(userId: string) {
  const { rows } = await pool.query<{ count: string }>(
    `select count(*) from checkups where user_id = $1 and status in ('queued', 'running')`,
    [userId],
  )
  return Number(rows[0]!.count)
}

export async function markRunning(id: string, stage: string) {
  await pool.query(`update checkups set status = 'running', stage = $2 where id = $1`, [id, stage])
}

export async function markDone(id: string, report: Report, screenshots: Partial<Record<Device, Buffer>>) {
  await pool.query(
    `update checkups
        set status = 'done', stage = null, report = $2, phone_screenshot = $3, laptop_screenshot = $4, finished_at = now()
      where id = $1`,
    [id, report, screenshots.phone ?? null, screenshots.laptop ?? null],
  )
}

export async function markFailed(id: string, error: string) {
  await pool.query(
    `update checkups set status = 'failed', stage = null, error = $2, finished_at = now() where id = $1`,
    [id, error],
  )
}

/** Jobs live in memory, so anything unfinished when the server stopped will never complete. */
export async function failInterruptedCheckups() {
  await pool.query(
    `update checkups set status = 'failed', stage = null, finished_at = now(),
            error = 'The checkup was interrupted. Please run it again.'
      where status in ('queued', 'running')`,
  )
}

export async function findScreenshot(id: string, device: Device): Promise<Buffer | null> {
  if (!UUID.test(id)) return null
  const column = device === 'phone' ? 'phone_screenshot' : 'laptop_screenshot'
  const { rows } = await pool.query<{ image: Buffer | null }>(`select ${column} as image from checkups where id = $1`, [id])
  return rows[0]?.image ?? null
}

export async function deleteCheckup(id: string, userId: string) {
  if (!UUID.test(id)) return false
  const { rowCount } = await pool.query('delete from checkups where id = $1 and user_id = $2', [id, userId])
  return rowCount === 1
}

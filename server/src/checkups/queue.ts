import { CheckupFailure } from './errors.js'
import { markDone, markFailed, markRunning, type NewCheckup } from './repository.js'
import { runCodeCheckup } from './codeCheckup.js'
import { runCheckup } from './runCheckup.js'
import { runScreenshotCheckup } from './screenshotCheckup.js'

// Each checkup runs a whole browser plus Lighthouse, which is heavy, so jobs run
// one at a time in this process. Anything waiting sits in memory.
const MAX_WAITING = 20
const JOB_TIMEOUT_MS = 150_000

export type Job = { id: string } & NewCheckup

const waiting: Job[] = []
let running = false

export function queueLength() {
  return waiting.length + (running ? 1 : 0)
}

export function isQueueFull() {
  return waiting.length >= MAX_WAITING
}

export function enqueueCheckup(job: Job) {
  waiting.push(job)
  void drain()
}

async function drain() {
  if (running) return
  running = true
  try {
    for (let job = waiting.shift(); job; job = waiting.shift()) await runJob(job)
  } finally {
    running = false
  }
}

async function runJob(job: Job) {
  const { id } = job
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JOB_TIMEOUT_MS)
  try {
    const onStage = (stage: string) => markRunning(id, stage)
    const result =
      job.source === 'url'
        ? await runCheckup(job.url, onStage, controller.signal)
        : job.source === 'code'
          ? await runCodeCheckup(job.code, job.symptoms, onStage, controller.signal)
          : await runScreenshotCheckup(job.image, job.symptoms, onStage, controller.signal)
    await markDone(id, result.report, result.screenshots)
  } catch (error) {
    let message = 'Something went wrong while checking that site. Please try again.'
    if (controller.signal.aborted) message = 'That site took too long to check. Try again in a minute.'
    else if (error instanceof CheckupFailure) message = error.message
    else console.error(`Checkup ${id} failed`, error)
    await markFailed(id, message).catch((dbError) => console.error('Could not record failed checkup', dbError))
  } finally {
    clearTimeout(timer)
  }
}

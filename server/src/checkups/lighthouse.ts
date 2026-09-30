import lighthouse from 'lighthouse'
import { CheckupFailure } from './errors.js'

// Lighthouse's own result types are large and shift between versions, so we read
// only the handful of fields we use and treat everything else as unknown.

export type MetricKey = 'FCP' | 'LCP' | 'TBT' | 'CLS' | 'SI'
export type MetricSavings = Partial<Record<MetricKey, number>>

interface LhNode {
  selector?: string
  snippet?: string
}

interface LhAudit {
  score: number | null
  numericValue?: number
  metricSavings?: MetricSavings
  scoringOptions?: { p10: number; median: number }
  details?: { items?: unknown }
}

interface LhResult {
  finalDisplayedUrl: string
  runtimeError?: { code: string; message: string }
  categories: { performance: { score: number | null; auditRefs: { id: string; weight: number }[] } }
  audits: Record<string, LhAudit | undefined>
}

const METRIC_AUDITS: Record<MetricKey, string> = {
  FCP: 'first-contentful-paint',
  LCP: 'largest-contentful-paint',
  TBT: 'total-blocking-time',
  CLS: 'cumulative-layout-shift',
  SI: 'speed-index',
}

export interface MetricScoring {
  p10: number
  median: number
  weight: number
}

export interface Finding<T> {
  items: T[]
  savings: MetricSavings
}

export interface SpeedFindings {
  finalUrl: string
  score: number
  /** Null when Lighthouse couldn't measure the metric (e.g. no LCP because content fades in from invisible). */
  metrics: Record<MetricKey, number | null>
  scoring: Record<MetricKey, MetricScoring>
  renderBlocking: Finding<{ url: string; bytes: number; wastedMs: number }>
  images: Finding<{ url: string; bytes: number; wastedBytes: number; reasons: string[]; selector: string | null }>
  unusedJs: Finding<{ url: string; bytes: number; wastedBytes: number }>
  unsizedImages: Finding<{ url: string; selector: string | null; snippet: string | null }>
  fontDisplay: Finding<{ url: string; wastedMs: number }>
  /** Elements that moved while the page loaded, biggest shift first. */
  layoutShifts: { selector: string; score: number }[]
  documentLatency: { redirectMs: number; serverResponseMs: number; compressed: boolean; savings: MetricSavings } | null
  requests: { url: string; transferSize: number; resourceType: string; mimeType: string }[]
}

export class PageLoadError extends CheckupFailure {}

function items(audit: LhAudit | undefined): Record<string, unknown>[] {
  const list = audit?.details?.items
  return Array.isArray(list) ? list : []
}

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function str(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function finding<T>(audit: LhAudit | undefined, map: (item: Record<string, unknown>) => T): Finding<T> {
  // A passing audit (score 1) has nothing to fix even when it lists items.
  if (!audit || audit.score === 1) return { items: [], savings: {} }
  return { items: items(audit).map(map), savings: audit.metricSavings ?? {} }
}

function node(item: Record<string, unknown>): LhNode {
  const value = item.node
  return typeof value === 'object' && value !== null ? (value as LhNode) : {}
}

/** Runs Lighthouse's mobile performance audit against a browser listening on `port`. */
async function audit(url: string, port: number) {
  const result = await lighthouse(url, {
    port,
    output: 'json',
    logLevel: 'silent',
    onlyCategories: ['performance'],
    maxWaitForLoad: 35_000,
  })
  const lhr = result?.lhr as unknown as LhResult | undefined
  if (!lhr) throw new Error('Lighthouse returned no result.')
  return lhr
}

export async function runLighthouse(url: string, port: number): Promise<SpeedFindings> {
  let lhr = await audit(url, port)
  // "Nothing painted" is sometimes a one-off on pages that animate in, so give it one more go.
  if (lhr.runtimeError?.code === 'NO_FCP') lhr = await audit(url, port)
  if (lhr.runtimeError) throw new PageLoadError(describeRuntimeError(lhr.runtimeError))

  const { audits } = lhr
  const weights = new Map(lhr.categories.performance.auditRefs.map((ref) => [ref.id, ref.weight]))

  const metrics = {} as Record<MetricKey, number | null>
  const scoring = {} as Record<MetricKey, MetricScoring>
  for (const [key, id] of Object.entries(METRIC_AUDITS) as [MetricKey, string][]) {
    const audit = audits[id]
    const value = audit?.numericValue
    metrics[key] = typeof value === 'number' && Number.isFinite(value) ? value : null
    scoring[key] = {
      p10: audit?.scoringOptions?.p10 ?? 1,
      median: audit?.scoringOptions?.median ?? 1,
      weight: weights.get(id) ?? 0,
    }
  }

  const latency = audits['document-latency-insight']
  const latencyDebug = (latency?.details as { debugData?: Record<string, unknown> } | undefined)?.debugData

  return {
    finalUrl: lhr.finalDisplayedUrl,
    // Lighthouse gives no overall score when a metric is missing; ours counts missing metrics as zero.
    score:
      lhr.categories.performance.score === null
        ? performanceScore(scoring, metrics)
        : Math.round(lhr.categories.performance.score * 100),
    metrics,
    scoring,
    renderBlocking: finding(audits['render-blocking-insight'], (item) => ({
      url: str(item.url),
      bytes: num(item.totalBytes),
      wastedMs: num(item.wastedMs),
    })),
    images: finding(audits['image-delivery-insight'], (item) => {
      const subItems = (item.subItems as { items?: { reason?: unknown }[] } | undefined)?.items ?? []
      return {
        url: str(item.url),
        bytes: num(item.totalBytes),
        wastedBytes: num(item.wastedBytes),
        reasons: subItems.map((sub) => str(sub.reason)).filter(Boolean),
        selector: node(item).selector ?? null,
      }
    }),
    unusedJs: finding(audits['unused-javascript'], (item) => ({
      url: str(item.url),
      bytes: num(item.totalBytes),
      wastedBytes: num(item.wastedBytes),
    })),
    unsizedImages: finding(audits['unsized-images'], (item) => ({
      url: str(item.url),
      selector: node(item).selector ?? null,
      snippet: node(item).snippet ?? null,
    })),
    fontDisplay: finding(audits['font-display-insight'], (item) => ({
      url: str(item.url),
      wastedMs: num(item.wastedMs),
    })),
    layoutShifts: items(audits['layout-shifts'])
      .map((item) => ({ selector: node(item).selector ?? '', score: num(item.score) }))
      .filter((shift) => shift.selector)
      .sort((a, b) => b.score - a.score),
    documentLatency:
      latency && latency.score !== 1 && latencyDebug
        ? {
            redirectMs: num(latencyDebug.redirectDuration),
            serverResponseMs: num(latencyDebug.serverResponseTime),
            compressed: num(latencyDebug.wastedBytes) === 0,
            savings: latency.metricSavings ?? {},
          }
        : null,
    requests: items(audits['network-requests']).map((item) => ({
      url: str(item.url),
      transferSize: num(item.transferSize),
      resourceType: str(item.resourceType),
      mimeType: str(item.mimeType),
    })),
  }
}

function describeRuntimeError({ code, message }: { code: string; message: string }) {
  const status = /status code: (\d+)/i.exec(message)?.[1]
  if (code === 'ERRORED_DOCUMENT_REQUEST' && status) return `That page returned an error (HTTP ${status}).`
  if (code === 'FAILED_DOCUMENT_REQUEST' || code === 'DNS_FAILURE') return 'We couldn’t load that page. Check the link and try again.'
  if (code === 'NO_FCP') return 'That page never showed anything on screen, so there was nothing to check.'
  if (code === 'PAGE_HUNG') return 'That page took too long to respond.'
  return 'We couldn’t finish loading that page. Try again in a minute.'
}

// Lighthouse scores each metric on a log-normal curve. Reusing it lets us estimate
// how much the speed score moves if a fix saves the time Lighthouse says it will.
// Ported from lighthouse/core/lib/statistics.js.
function erf(x: number) {
  const sign = Math.sign(x)
  x = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * x)
  const y = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))))
  return sign * (1 - y * Math.exp(-x * x))
}

function logNormalScore({ median, p10 }: MetricScoring, value: number) {
  if (value <= 0) return 1
  const INVERSE_ERFC_ONE_FIFTH = 0.9062373897287951
  const standardizedX = (Math.log(value / median) * INVERSE_ERFC_ONE_FIFTH) / -Math.log(p10 / median)
  const score = (1 - erf(standardizedX)) / 2
  // Keep each metric inside the band its thresholds put it in (good / needs work / poor).
  if (value <= p10) return Math.max(0.9, Math.min(1, score))
  if (value <= median) return Math.max(0.5, Math.min(0.8999999999999999, score))
  return Math.max(0, Math.min(0.49999999999999994, score))
}

/** Lighthouse's weighted score. A metric that couldn't be measured scores zero. */
export function performanceScore(scoring: Record<MetricKey, MetricScoring>, metrics: Record<MetricKey, number | null>) {
  let total = 0
  let weights = 0
  for (const key of Object.keys(scoring) as MetricKey[]) {
    const value = metrics[key]
    const metricScore = value === null ? 0 : Math.round(logNormalScore(scoring[key], value) * 100) / 100
    total += metricScore * scoring[key].weight
    weights += scoring[key].weight
  }
  return weights ? Math.round((total / weights) * 100) : 0
}

/** Metric values after removing the given savings. Nothing gets faster than Lighthouse's "good" line halved. */
export function applySavings(
  scoring: Record<MetricKey, MetricScoring>,
  metrics: Record<MetricKey, number | null>,
  savings: MetricSavings[],
) {
  const next = { ...metrics }
  for (const saving of savings) {
    for (const [key, amount] of Object.entries(saving) as [MetricKey, number][]) {
      const current = next[key]
      if (current === null || current === undefined || !amount) continue
      next[key] = Math.max(Math.min(current, scoring[key].p10 / 2), current - amount)
    }
  }
  return next
}

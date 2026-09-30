import { devices, type Browser, type Page } from 'playwright'
import { CheckupFailure } from './errors.js'
import { inspectPage, type PageInspection } from './inspectPage.js'
import { PageLoadError } from './lighthouse.js'
import type { Device } from './types.js'
import { isPublicHost } from './urlSafety.js'

const DEVICE_OPTIONS = {
  phone: { ...devices['Pixel 7'], deviceScaleFactor: 2 },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const

// Long pages are cut off here so screenshots stay a sensible size.
const MAX_SCREENSHOT_HEIGHT = { phone: 5000, laptop: 3600 }

export interface LayoutFindings {
  device: Device
  inspection: PageInspection
  screenshot: Buffer
  screenshotSize: { width: number; height: number }
  failedRequests: { url: string; status: number | null }[]
  consoleErrors: string[]
}

/** What to load: a live site, or pasted HTML rendered with no network access at all. */
export type LayoutTarget = { url: string } | { html: string }

export interface OpenLayout {
  findings: LayoutFindings
  /** The inspected page, left open so callers can look elements up on it. */
  page: Page
  close: () => Promise<void>
}

/** Loads the target on one device, inspects it and screenshots it. The caller must call `close()`. */
export async function openLayout(browser: Browser, target: LayoutTarget, device: Device): Promise<OpenLayout> {
  const context = await browser.newContext({ ...DEVICE_OPTIONS[device], serviceWorkers: 'block' })
  const close = () => context.close()
  try {
    if ('html' in target) {
      // Pasted code gets no network: its relative files don't exist here, and it
      // mustn't be able to make the server fetch anything.
      await context.route('**/*', (route) =>
        route.request().url().startsWith('data:') ? route.fallback() : route.abort('blockedbyclient'),
      )
    } else {
      // Every request the page makes, not just the first, has to stay on the public internet.
      await context.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url())
        const allowed =
          requestUrl.protocol === 'data:' || requestUrl.protocol === 'blob:' || (await isPublicHost(requestUrl.hostname))
        await (allowed ? route.fallback() : route.abort('blockedbyclient'))
      })
    }

    const page = await context.newPage()
    const failedRequests: LayoutFindings['failedRequests'] = []
    const consoleErrors: string[] = []

    page.on('response', (response) => {
      if (response.status() >= 400 && response.request().resourceType() !== 'document') {
        failedRequests.push({ url: response.url(), status: response.status() })
      }
    })
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? ''
      if (!reason.includes('ERR_ABORTED') && !reason.includes('BLOCKED_BY_CLIENT')) {
        failedRequests.push({ url: request.url(), status: null })
      }
    })
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300))
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message.slice(0, 300)))

    if ('html' in target) {
      await page.setContent(target.html, { waitUntil: 'load', timeout: 15_000 }).catch(() => {
        throw new CheckupFailure('Your code took too long to render. Does it have a script that never finishes?')
      })
    } else {
      try {
        await page.goto(target.url, { waitUntil: 'load', timeout: 30_000 })
      } catch {
        throw new PageLoadError('That page took too long to load on a phone. Try again in a minute.')
      }
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    }

    // Scroll through once so lazy-loaded images and content show up, then settle at the top.
    await page.evaluate(async () => {
      const step = document.documentElement.clientHeight
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, step * 12); y += step) {
        window.scrollTo(0, y)
        await new Promise((resolve) => setTimeout(resolve, 120))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(600)

    // tsx keeps function names by wrapping them in __name(), which doesn't exist in the page.
    const inspection = (await page.evaluate(
      `(() => { const __name = (fn) => fn; return (${inspectPage.toString()})() })()`,
    )) as PageInspection

    const screenshotSize = {
      width: inspection.viewportWidth,
      height: Math.max(1, Math.min(inspection.docHeight, MAX_SCREENSHOT_HEIGHT[device])),
    }
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 65,
      fullPage: true,
      clip: { x: 0, y: 0, ...screenshotSize },
      timeout: 20_000,
    })

    return { findings: { device, inspection, screenshot, screenshotSize, failedRequests, consoleErrors }, page, close }
  } catch (error) {
    await close()
    throw error
  }
}

export async function inspectLayout(browser: Browser, url: string, device: Device): Promise<LayoutFindings> {
  const { findings, close } = await openLayout(browser, { url }, device)
  await close()
  return findings
}

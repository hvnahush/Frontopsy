import { createServer } from 'node:net'
import { chromium } from 'playwright'
import { buildReport } from './diagnose.js'
import { inspectLayout, type LayoutFindings } from './layout.js'
import { runLighthouse } from './lighthouse.js'
import type { Device, Report } from './types.js'

export type Stage = 'Opening your site' | 'Timing every request' | 'Checking it on a phone' | 'Checking it on a laptop' | 'Writing up the diagnosis'

export interface CheckupResult {
  report: Report
  /** Missing for a device when nothing was rendered. */
  screenshots: Partial<Record<Device, Buffer>>
}

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('No port'))))
    })
  })
}

/** Runs the full checkup against one URL in a fresh, throwaway browser. */
export async function runCheckup(
  url: string,
  onStage: (stage: Stage) => Promise<void>,
  signal: AbortSignal,
): Promise<CheckupResult> {
  await onStage('Opening your site')
  // Lighthouse drives the browser over the DevTools protocol, so it needs a debugging port.
  const port = await freePort()
  const browser = await chromium.launch({
    args: [
      `--remote-debugging-port=${port}`,
      '--remote-debugging-address=127.0.0.1',
      // Lighthouse's tab counts as a background tab in headless Chrome, which pauses CSS
      // animations. Pages that fade in from opacity 0 would then never "paint".
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
    ],
  })
  // Closing the browser makes whatever step is in flight fail fast.
  const abort = () => void browser.close()
  signal.addEventListener('abort', abort, { once: true })

  try {
    await onStage('Timing every request')
    const speed = await runLighthouse(url, port)

    const layouts: LayoutFindings[] = []
    await onStage('Checking it on a phone')
    layouts.push(await inspectLayout(browser, speed.finalUrl || url, 'phone'))
    await onStage('Checking it on a laptop')
    layouts.push(await inspectLayout(browser, speed.finalUrl || url, 'laptop'))

    await onStage('Writing up the diagnosis')
    const report = buildReport(url, speed, layouts, new Date())
    return {
      report,
      screenshots: Object.fromEntries(layouts.map((l) => [l.device, l.screenshot])),
    }
  } finally {
    signal.removeEventListener('abort', abort)
    await browser.close()
  }
}

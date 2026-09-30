import type { AuthoredRule, Box, ElementInfo } from './inspectPage.js'
import type { LayoutFindings } from './layout.js'
import { applySavings, performanceScore, type MetricKey, type MetricSavings, type SpeedFindings } from './lighthouse.js'
import type { CodeLang, Device, Issue, Report, Severity, Vital, WeightCategory } from './types.js'

// Every issue here comes from something we measured; the wording and fix code are
// templates filled in with the real file names, selectors and sizes.

interface Draft extends Omit<Issue, 'id' | 'gain'> {
  /** A few words for the summary sentence, e.g. "one huge image". */
  short: string
  /** Speed issues: how much Lighthouse says fixing this saves. */
  savings?: MetricSavings
  /** Speed issues: metric values to assume once fixed, for metrics that couldn't be measured at all. */
  assume?: Partial<Record<MetricKey, number>>
}

export const LOOKS_PENALTY: Record<Severity, number> = { 'big yikes': 15, 'kinda sus': 8, meh: 4 }
export const SEVERITY_ORDER: Record<Severity, number> = { 'big yikes': 0, 'kinda sus': 1, meh: 2 }
const PHONE_BREAKPOINT = 720

// ---------- small helpers ----------

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

/** How to reference a file in fix code: a root-relative path on the same site, the full URL otherwise. */
function hrefFor(url: string, pageUrl: string) {
  try {
    const u = new URL(url)
    return u.host === new URL(pageUrl).host ? `${u.pathname}${u.search}` : u.href
  } catch {
    return url
  }
}

/** "assets/hero.png" for same-site files, "cdn.example.com/lib.js" for others. */
function displayPath(url: string, pageUrl: string) {
  try {
    const u = new URL(url)
    const page = new URL(pageUrl)
    const path = decodeURIComponent(u.pathname).replace(/^\//, '') || u.hostname
    return u.hostname === page.hostname ? path : `${u.hostname}/${path}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

function fileName(url: string) {
  try {
    const u = new URL(url)
    return decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() ?? u.hostname)
  } catch {
    return url
  }
}

function sameResource(a: string, b: string) {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.host === ub.host && ua.pathname === ub.pathname && ua.search === ub.search
  } catch {
    return a === b
  }
}

function samePath(a: string, b: string) {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.host === ub.host && ua.pathname === ub.pathname
  } catch {
    return a === b
  }
}

export function pinFor(device: Device, box: Box, shot: { width: number; height: number }) {
  const x = (box.x + Math.min(box.width, shot.width - box.x) / 2) / shot.width
  const y = (box.y + Math.min(box.height / 2, 40)) / shot.height
  if (y < 0 || y > 1) return null
  return { device, x: Math.min(0.94, Math.max(0.06, x)), y: Math.min(0.98, Math.max(0.01, y)) }
}

function friendlyName(selector: string) {
  const s = selector.toLowerCase()
  const last = s.split('>').pop()!.trim()
  if (/^(nav|header)\b|[.#-](nav|navbar|menu|header)\b/.test(last)) return 'The nav'
  if (/^footer\b|[.#-]footer\b/.test(last)) return 'The footer'
  if (/banner|promo|announcement/.test(last)) return 'The banner'
  if (/hero/.test(last)) return 'The hero section'
  if (/^img\b/.test(last)) return 'An image'
  if (/^(table)\b/.test(last)) return 'A table'
  if (/^(pre|code)\b/.test(last)) return 'A code block'
  if (/^(iframe|video)\b/.test(last)) return 'An embed'
  if (/^(button)\b|btn|button/.test(last)) return 'A button'
  return `\`${selector}\``
}

function lowerFirst(text: string) {
  return text.startsWith('`') ? text : text.charAt(0).toLowerCase() + text.slice(1)
}

function friendlyText(selector: string) {
  const last = selector.toLowerCase().split('>').pop()!.trim()
  if (/^h1\b/.test(last)) return 'the headline'
  if (/^h[2-6]\b/.test(last)) return 'a heading'
  if (/^(a|button)\b/.test(last)) return 'a link'
  return 'some text'
}

/** The last value the site's CSS sets for a property, with the rule it came from. */
function authored(rules: AuthoredRule[], prop: string) {
  return [...rules].reverse().find((rule) => rule.prop === prop)
}

/** The selector to put in fix code: the site's own rule when we found one. */
function fixSelector(element: ElementInfo, ...props: string[]) {
  for (const prop of props) {
    const rule = authored(element.rules, prop)
    if (rule && rule.selector !== 'style=""') return rule.selector
  }
  return element.selector
}

function cssBlock(selector: string, declarations: string[], indent = '') {
  return `${indent}${selector} {\n${declarations.map((d) => `${indent}  ${d};`).join('\n')}\n${indent}}`
}

function onDevices(devices: Device[]) {
  if (devices.length === 2) return ''
  return devices[0] === 'phone' ? ' on phones' : ' on laptops'
}

// ---------- speed issues (from Lighthouse, which tests as a phone) ----------

function speedIssues(speed: SpeedFindings, layouts: LayoutFindings[], pageUrl: string): Draft[] {
  const drafts: Draft[] = []
  const phone = layouts.find((l) => l.device === 'phone')
  const mime = new Map(speed.requests.map((r) => [r.url, r.mimeType]))

  const pinsForImage = (url: string) =>
    layouts.flatMap((layout) => {
      const img = layout.inspection.images
        .filter((i) => samePath(i.src, url))
        .sort((a, b) => a.box.y - b.box.y)[0]
      const pin = img && pinFor(layout.device, img.box, layout.screenshotSize)
      return pin ? [pin] : []
    })

  // Chrome never recorded when the page appeared, so Google can't time it either.
  const lcpMissing = speed.metrics.LCP === null
  if (lcpMissing || speed.metrics.FCP === null) {
    const fade = layouts.flatMap((l) => l.inspection.fadeIns)[0]
    const metric = lcpMissing ? 'when your main content appears (Largest Contentful Paint)' : 'when anything appears (First Contentful Paint)'
    const phoneFade = phone?.inspection.fadeIns[0]
    const pin = phone && phoneFade ? pinFor('phone', phoneFade.box, phone.screenshotSize) : null
    const keyframes = fade?.animation.split(', ')[0]
    drafts.push({
      kind: 'slow',
      severity: 'big yikes',
      title: fade ? 'Your page fades in, so Google can’t time it' : 'Google can’t measure when your page shows up',
      where: fade ? 'on screenshot' : 'in your code',
      location: fade ? `${fade.selector} · animation: ${fade.animation}` : 'main content',
      whatsUp: `Chrome never recorded ${metric}. ${
        fade
          ? `\`${fade.selector}\` starts invisible with the \`${fade.animation}\` animation, and content that fades in from opacity 0 doesn’t count as painted.`
          : 'This usually happens when the main content starts invisible (opacity: 0) and fades in.'
      } Google uses this number for search ranking, and here it counts as zero in your speed score.`,
      fix: 'Make the main content visible from the very first frame. Keep the motion if you like, but animate position (a small slide) instead of fading from fully transparent.',
      code: keyframes
        ? `@keyframes ${keyframes} {\n  from { opacity: 1; transform: translateY(8px); }\n  to { opacity: 1; transform: none; }\n}`
        : null,
      codeLang: keyframes ? 'css' : null,
      devices: ['phone', 'laptop'],
      pins: pin ? [pin] : [],
      short: fade ? 'a fade-in that hides the page from Google' : 'content Google can’t see paint',
      // Once visible, the main content would paint about when anything else does.
      assume: lcpMissing && speed.metrics.FCP !== null ? { LCP: speed.metrics.FCP, TBT: 0 } : {},
    })
  }

  // Render-blocking scripts and stylesheets.
  const blocking = speed.renderBlocking.items.filter((item) => item.url)
  if (blocking.length) {
    const scripts = blocking.filter((i) => /javascript/.test(mime.get(i.url) ?? '') || /\.m?js(\?|$)/.test(i.url))
    const styles = blocking.filter((i) => !scripts.includes(i))
    const noun = styles.length === 0 ? 'script' : scripts.length === 0 ? 'stylesheet' : 'file'
    const saved = Math.max(speed.renderBlocking.savings.FCP ?? 0, speed.renderBlocking.savings.LCP ?? 0)
    const code = [
      ...scripts.map((s) => `<script src="${hrefFor(s.url, pageUrl)}" defer></script>`),
      ...styles.map(
        (s) =>
          `<link rel="preload" href="${hrefFor(s.url, pageUrl)}" as="style" onload="this.rel='stylesheet'">`,
      ),
    ].join('\n')

    drafts.push({
      kind: 'slow',
      severity: saved >= 1000 ? 'big yikes' : saved >= 300 ? 'kinda sus' : 'meh',
      title: `${plural(blocking.length, noun)} ${blocking.length === 1 ? 'blocks' : 'block'} your first paint`,
      where: 'in your code',
      location: `${displayPath(pageUrl, pageUrl) === new URL(pageUrl).hostname ? 'index.html' : fileName(pageUrl)} · <head>`,
      whatsUp: `The browser has to download ${blocking.length === 1 ? '' : 'and run '}${blocking
        .slice(0, 3)
        .map((b) => fileName(b.url))
        .join(', ')}${blocking.length > 3 ? ` and ${blocking.length - 3} more` : ''} before it can show anything${
        saved >= 50 ? `, which holds the first paint back by about ${formatMs(saved)} on a phone` : ''
      }.`,
      fix: scripts.length
        ? 'Add `defer` so scripts download in the background and run after the page is shown.' +
          (styles.length ? ' Load stylesheets that aren’t needed for the first screen without blocking.' : '')
        : 'Inline the few styles the first screen needs and load the rest without blocking.',
      code,
      codeLang: 'html',
      devices: ['phone', 'laptop'],
      pins: [],
      short: plural(blocking.length, `blocking ${noun}`),
      savings: speed.renderBlocking.savings,
    })
  }

  // Oversized images. Lighthouse reports one saving for all images, so share it out by bytes.
  const heavyImages = speed.images.items.filter((i) => i.wastedBytes >= 100 * 1024).sort((a, b) => b.wastedBytes - a.wastedBytes)
  const totalWasted = speed.images.items.reduce((sum, i) => sum + i.wastedBytes, 0) || 1
  const shareOf = (savings: MetricSavings, fraction: number): MetricSavings =>
    Object.fromEntries(Object.entries(savings).map(([k, v]) => [k, (v ?? 0) * fraction]))

  // The same file is often listed once per <img> that uses it.
  const byFile = new Map<string, (typeof heavyImages)[number] & { count: number }>()
  for (const image of heavyImages) {
    const key = new URL(image.url).pathname
    const existing = byFile.get(key)
    if (existing) {
      existing.count += 1
      existing.wastedBytes += image.wastedBytes
    } else byFile.set(key, { ...image, count: 1 })
  }
  const images = [...byFile.values()].sort((a, b) => b.wastedBytes - a.wastedBytes)

  for (const image of images.slice(0, 3)) {
    const name = fileName(image.url)
    const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase() ?? ''
    const webpName = name.replace(/\.\w+$/, '') + '.webp'
    const oversize = image.reasons
      .map((r) => /\((\d+)x(\d+)\) for its displayed dimensions \((\d+)x(\d+)\)/.exec(r))
      .find(Boolean)
    const modern = image.reasons.some((r) => /modern image format|compression/i.test(r)) && ext !== 'webp' && ext !== 'avif'
    const shown = layouts.flatMap((l) => l.inspection.images.filter((i) => samePath(i.src, image.url)))
    const natural = shown.find((i) => i.naturalWidth)
    const belowFold = phone ? shown.every((i) => i.box.y > phone.inspection.viewportHeight) : false

    const reasons: string[] = []
    if (modern) reasons.push(`as ${ext ? ext.toUpperCase() : 'this format'} it’s far bigger than it needs to be; WebP or AVIF is usually 60–90% smaller`)
    if (oversize) reasons.push(`it’s ${oversize[1]}×${oversize[2]} pixels but only shows at about ${oversize[3]}×${oversize[4]} on a phone`)
    if (!reasons.length) reasons.push('it could be compressed a lot more')

    const width = natural?.naturalWidth
    const height = natural?.naturalHeight
    const attrs = [
      `src="${webpName}"`,
      ...(oversize && width
        ? [`srcset="${webpName.replace('.webp', '-800.webp')} 800w, ${webpName} ${width}w"`, 'sizes="100vw"']
        : []),
      ...(width && height ? [`width="${width}"`, `height="${height}"`] : []),
      belowFold ? 'loading="lazy"' : 'fetchpriority="high"',
      'alt="…"',
    ]
    const pins = pinsForImage(image.url)

    drafts.push({
      kind: 'slow',
      severity: image.wastedBytes >= 1024 * 1024 ? 'big yikes' : image.wastedBytes >= 250 * 1024 ? 'kinda sus' : 'meh',
      title: `${name} is ${formatBytes(image.bytes)}`,
      where: pins.length ? 'on screenshot' : 'in your code',
      location: displayPath(image.url, pageUrl),
      whatsUp: `${reasons.join(', and ')}. Shrinking it could save about ${formatBytes(image.wastedBytes / image.count)}${image.count > 1 ? ` (it’s loaded ${image.count} times)` : ''}.`.replace(/^./, (c) => c.toUpperCase()),
      fix: `Convert it to WebP (squoosh.app does it in the browser, or run \`cwebp -q 75 ${name} -o ${webpName}\`)${oversize ? ', export a smaller copy for phones' : ''}, then point the image at the new file.`,
      code: `<img\n  ${attrs.join('\n  ')}\n>`,
      codeLang: 'html',
      devices: ['phone', 'laptop'],
      pins,
      short: image.wastedBytes >= 1024 * 1024 ? 'one huge image' : 'heavy images',
      savings: shareOf(speed.images.savings, image.wastedBytes / totalWasted),
    })
  }

  if (images.length > 3) {
    const rest = images.slice(3)
    const restWasted = rest.reduce((sum, i) => sum + i.wastedBytes, 0)
    drafts.push({
      kind: 'slow',
      severity: restWasted >= 1024 * 1024 ? 'kinda sus' : 'meh',
      title: `${plural(rest.length, 'more image')} could be much smaller`,
      where: 'in your code',
      location: rest
        .slice(0, 3)
        .map((i) => fileName(i.url))
        .join(', '),
      whatsUp: `Together they waste about ${formatBytes(restWasted)} that every visitor has to download.`,
      fix: 'Convert them to WebP or AVIF and export them at the size they’re actually shown.',
      code: null,
      codeLang: null,
      devices: ['phone', 'laptop'],
      pins: rest.flatMap((i) => pinsForImage(i.url)).slice(0, 3),
      short: 'heavy images',
      savings: shareOf(speed.images.savings, restWasted / totalWasted),
    })
  }

  // JavaScript that downloads but never runs.
  const unusedTotal = speed.unusedJs.items.reduce((sum, i) => sum + i.wastedBytes, 0) || 1
  for (const script of speed.unusedJs.items.filter((i) => i.wastedBytes >= 50 * 1024).slice(0, 2)) {
    const percent = Math.round((script.wastedBytes / Math.max(script.bytes, 1)) * 100)
    drafts.push({
      kind: 'slow',
      severity: script.wastedBytes >= 500 * 1024 ? 'big yikes' : script.wastedBytes >= 150 * 1024 ? 'kinda sus' : 'meh',
      title: `${percent}% of ${fileName(script.url)} never runs on this page`,
      where: 'in your code',
      location: displayPath(script.url, pageUrl),
      whatsUp: `It’s ${formatBytes(script.bytes)}, and about ${formatBytes(script.wastedBytes)} of it is code this page doesn’t use. Phones still have to download and parse all of it.`,
      fix: 'Split code so each page loads only what it needs. Load rarely used features when they’re first used, and import single functions instead of whole libraries.',
      code: `// Import one function, not the whole library\nimport debounce from 'lodash/debounce'\n\n// Load heavy features only when someone uses them\nbutton.addEventListener('click', async () => {\n  const { openGallery } = await import('./gallery.js')\n  openGallery()\n})`,
      codeLang: 'js',
      devices: ['phone', 'laptop'],
      pins: [],
      short: 'unused JavaScript',
      savings: shareOf(speed.unusedJs.savings, script.wastedBytes / unusedTotal),
    })
  }

  // Fonts that hide text while they load.
  if (speed.fontDisplay.items.length) {
    const font = speed.fontDisplay.items[0]!
    drafts.push({
      kind: 'slow',
      severity: 'meh',
      title: 'Text stays invisible while fonts load',
      where: 'in your code',
      location: displayPath(font.url, pageUrl),
      whatsUp: `${plural(speed.fontDisplay.items.length, 'web font')} hide the text until they finish downloading, so visitors stare at blank space.`,
      fix: 'Add `font-display: swap` so text shows right away in a fallback font and swaps when yours arrives.',
      code: cssBlock('@font-face', [`font-family: 'Your Font'`, `src: url('${hrefFor(font.url, pageUrl)}')`, 'font-display: swap']),
      codeLang: 'css',
      devices: ['phone', 'laptop'],
      pins: [],
      short: 'slow fonts',
      savings: speed.fontDisplay.savings,
    })
  }

  // Slow server, redirects, no compression.
  const latency = speed.documentLatency
  if (latency) {
    const problems: string[] = []
    if (latency.redirectMs > 0) problems.push(`the link redirects first (${formatMs(latency.redirectMs)})`)
    if (latency.serverResponseMs > 600) problems.push(`the server takes ${formatMs(latency.serverResponseMs)} to answer`)
    if (!latency.compressed) problems.push('the HTML isn’t compressed')
    if (problems.length) {
      drafts.push({
        kind: 'slow',
        severity: latency.serverResponseMs > 1500 ? 'big yikes' : 'kinda sus',
        title: latency.serverResponseMs > 600 ? `Your server takes ${formatMs(latency.serverResponseMs)} to respond` : latency.redirectMs > 0 ? 'Your link redirects before the page loads' : 'Your HTML isn’t compressed',
        where: 'in your code',
        location: displayPath(pageUrl, pageUrl),
        whatsUp: `Before anything else happens, ${problems.join(', and ')}.`,
        fix: [
          latency.redirectMs > 0 ? 'Link straight to the final address.' : '',
          latency.serverResponseMs > 600 ? 'Cache the page (or put it behind a CDN) so it isn’t rebuilt on every visit.' : '',
          !latency.compressed ? 'Turn on gzip or Brotli on your server or host.' : '',
        ]
          .filter(Boolean)
          .join(' '),
        code: !latency.compressed ? '# nginx\ngzip on;\ngzip_types text/html text/css application/javascript;' : null,
        codeLang: !latency.compressed ? 'shell' : null,
        devices: ['phone', 'laptop'],
        pins: [],
        short: 'a slow server',
        savings: latency.savings,
      })
    }
  }

  // Busy main thread not explained by unused code.
  const tbt = speed.metrics.TBT ?? 0
  if (tbt > 600 && !drafts.some((d) => d.short === 'unused JavaScript')) {
    drafts.push({
      kind: 'slow',
      severity: tbt > 1200 ? 'big yikes' : 'kinda sus',
      title: `Taps are ignored for ${formatMs(tbt)} while JavaScript runs`,
      where: 'in your code',
      location: 'main thread',
      whatsUp: 'Long-running scripts keep the browser busy, so taps and scrolls wait until they finish.',
      fix: 'Find the long tasks in Chrome DevTools’ Performance panel, then defer non-essential scripts (analytics, chat widgets) and break big jobs into smaller chunks.',
      code: `// Let the browser breathe between chunks of work\nfor (const item of items) {\n  process(item)\n  await new Promise((r) => setTimeout(r, 0))\n}`,
      codeLang: 'js',
      devices: ['phone', 'laptop'],
      pins: [],
      short: 'heavy JavaScript',
      savings: { TBT: (tbt - 200) / 2 },
    })
  }

  return drafts
}

// ---------- looks issues (from our own Playwright checks) ----------

/** Merges the same problem found on phone and laptop into one draft. */
function mergeByKey(entries: { key: string; device: Device; build: (devices: Device[]) => Draft; pin: Issue['pins'][number] | null }[]) {
  const groups = new Map<string, typeof entries>()
  for (const entry of entries) groups.set(entry.key, [...(groups.get(entry.key) ?? []), entry])
  return [...groups.values()].map((group) => {
    const devices = [...new Set(group.map((g) => g.device))].sort() as Device[]
    const draft = group.find((g) => g.device === 'phone')?.build(devices) ?? group[0]!.build(devices)
    draft.pins = group.flatMap((g) => (g.pin ? [g.pin] : []))
    return draft
  })
}

function overflowFix(element: ElementInfo, viewportWidth: number, text: string): { cause: string; code: string } {
  const width = authored(element.rules, 'width')
  const minWidth = authored(element.rules, 'min-width')
  const selector = fixSelector(element, 'width', 'min-width')
  const px = (value: string | undefined) => (value && /^\d+(\.\d+)?px$/.test(value) ? parseFloat(value) : null)

  if (/^img\b|>\s*img\b/.test(element.selector)) {
    return { cause: '', code: cssBlock('img', ['max-width: 100%', 'height: auto']) }
  }
  if (width && px(width.value) && px(width.value)! > viewportWidth) {
    return {
      cause: ` because of \`width: ${width.value}\``,
      code: cssBlock(selector, ['width: 100%', `max-width: ${width.value}`, 'box-sizing: border-box']),
    }
  }
  if (width && /vw/.test(width.value)) {
    return {
      cause: ` because \`width: ${width.value}\` doesn’t leave room for its padding`,
      code: cssBlock(selector, ['width: 100%', 'box-sizing: border-box']),
    }
  }
  if (minWidth && px(minWidth.value) && px(minWidth.value)! > viewportWidth) {
    return { cause: ` because of \`min-width: ${minWidth.value}\``, code: cssBlock(selector, ['min-width: 0']) }
  }
  if (text && !/\s/.test(text.slice(0, 40)) && text.length > 20) {
    return { cause: ' because of a long word or link that can’t wrap', code: cssBlock(selector, ['overflow-wrap: anywhere']) }
  }
  return { cause: '', code: cssBlock(selector, ['max-width: 100%', 'box-sizing: border-box']) }
}

function ruleSummary(element: ElementInfo) {
  const props = ['position', 'width', 'left', 'top', 'transform', 'margin-top']
  const decls = props.flatMap((prop) => {
    const rule = authored(element.rules, prop)
    return rule ? [`${prop}: ${rule.value}`] : []
  })
  const selector = fixSelector(element, 'position', 'width')
  return decls.length ? `${selector} { ${decls.slice(0, 3).join('; ')} }` : selector
}

function looksIssues(layouts: LayoutFindings[], pageUrl: string, speed: SpeedFindings): Draft[] {
  const drafts: Draft[] = []
  const phone = layouts.find((l) => l.device === 'phone')

  if (phone && !phone.inspection.hasViewportMeta) {
    drafts.push({
      kind: 'broken',
      severity: 'big yikes',
      title: 'Phones show a shrunk-down desktop page',
      where: 'in your code',
      location: '<head>',
      whatsUp: 'There’s no viewport meta tag, so phones pretend to be a 980px-wide screen and zoom everything out until it’s tiny.',
      fix: 'Add the viewport tag to your <head> so the page is laid out for the phone’s real width.',
      code: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      codeLang: 'html',
      devices: ['phone'],
      pins: [],
      short: 'there’s no viewport tag',
    })
  }

  // An element that both covers text and overflows gets one issue: the covering one, whose fix handles both.
  const coverers = new Set(layouts.flatMap((l) => l.inspection.covered.map((c) => c.coverer.selector)))
  const alsoOverflows = new Set(
    layouts.flatMap((l) => l.inspection.overflow.map((o) => o.selector)).filter((s) => coverers.has(s)),
  )

  // Sideways scroll.
  drafts.push(
    ...mergeByKey(
      layouts.flatMap((layout) =>
        layout.inspection.overflow.filter((element) => !coverers.has(element.selector)).map((element) => ({
          key: `overflow:${element.selector}`,
          device: layout.device,
          pin: pinFor(layout.device, element.box, layout.screenshotSize),
          build: (devices: Device[]): Draft => {
            const vw = layout.inspection.viewportWidth
            const { cause, code } = overflowFix(element, vw, element.text)
            const name = friendlyName(element.selector)
            const extra = element.box.x + element.box.width - vw
            return {
              kind: 'broken',
              severity: layout.device === 'phone' && extra > 16 ? 'big yikes' : 'kinda sus',
              title: `${name} makes the page scroll sideways${onDevices(devices)}`,
              where: 'on screenshot',
              location: element.selector,
              whatsUp: `It reaches ${Math.round(extra)}px past the edge of a ${vw}px screen${cause}, so the whole page wobbles sideways when you scroll.`,
              fix: 'Let it shrink to fit the screen instead of forcing a fixed width.',
              code,
              codeLang: 'css',
              devices,
              pins: [],
              short: `${lowerFirst(name)} is wider than the screen`,
            }
          },
        })),
      ),
    ),
  )

  // Something painted on top of text.
  drafts.push(
    ...mergeByKey(
      layouts.flatMap((layout) =>
        layout.inspection.covered.map(({ coverer, texts }) => ({
          key: `covered:${coverer.selector}`,
          device: layout.device,
          pin: pinFor(layout.device, coverer.box, layout.screenshotSize),
          build: (devices: Device[]): Draft => {
            const name = friendlyName(coverer.selector)
            const victim = friendlyText(texts[0]!.selector)
            const selector = fixSelector(coverer, 'position', 'width')
            const width = authored(coverer.rules, 'width')
            const phoneOnly = devices.length === 1 && devices[0] === 'phone'
            let whatsUp: string
            let fix: string
            let code: string | null
            if (coverer.position === 'absolute') {
              whatsUp = `${name} is absolutely positioned, so it’s pulled out of the normal flow and lands on top of ${victim} (“${texts[0]!.text}”).`
              fix = `Keep it in normal flow${phoneOnly ? ' on small screens' : ''} so the content starts below it.`
              const decls = ['position: static', ...(width && /px$/.test(width.value) ? ['width: 100%', `max-width: ${width.value}`] : [])]
              code = phoneOnly
                ? `@media (max-width: ${PHONE_BREAKPOINT}px) {\n${cssBlock(selector, decls, '  ')}\n}`
                : cssBlock(selector, decls)
            } else if (coverer.position === 'fixed' || coverer.position === 'sticky') {
              whatsUp = `${name} is pinned to the screen and ${coverer.box.height}px tall, but the page doesn’t leave room for it, so it covers ${victim} (“${texts[0]!.text}”).`
              fix = 'Push the page content down by the height of the fixed element.'
              code = cssBlock('body', [`padding-top: ${coverer.box.height}px`])
            } else {
              whatsUp = `${name} overlaps ${victim} (“${texts[0]!.text}”), usually from a negative margin, a transform or a fixed height that’s too small.`
              fix = 'Remove the offset that pulls it over the text, or give the container room to grow with `height: auto`.'
              code = null
            }
            if (alsoOverflows.has(coverer.selector)) {
              whatsUp += ` It’s also wider than a phone screen, so the whole page scrolls sideways.`
            }
            return {
              kind: 'broken',
              severity: 'big yikes',
              title: `${name} sits on top of ${victim}${onDevices(devices)}`,
              where: 'on screenshot',
              location: ruleSummary(coverer),
              whatsUp,
              fix,
              code,
              codeLang: code ? 'css' : null,
              devices,
              pins: [],
              short: `${lowerFirst(name)} covers ${victim}`,
            }
          },
        })),
      ),
    ),
  )

  if (phone) {
    const tiny = phone.inspection.tinyText
    if (tiny.length) {
      const selectors = [...new Set(tiny.map((t) => t.selector))].slice(0, 3)
      const smallest = Math.min(...tiny.map((t) => t.fontSize))
      const pin = pinFor('phone', tiny[0]!.box, phone.screenshotSize)
      drafts.push({
        kind: 'broken',
        severity: tiny.length >= 5 ? 'kinda sus' : 'meh',
        title: tiny.length === 1 ? 'Some text is too small to read on phones' : `${tiny.length}${tiny.length >= 20 ? '+' : ''} bits of text are too small to read on phones`,
        where: 'on screenshot',
        location: selectors.join(', '),
        whatsUp: `Some text is as small as ${smallest}px, like “${tiny[0]!.text}”. Anything under 12px is hard to read on a phone.`,
        fix: 'Bump small text to at least 14px on phones.',
        code: cssBlock(selectors.join(',\n'), ['font-size: 14px']),
        codeLang: 'css',
        devices: ['phone'],
        pins: pin ? [pin] : [],
        short: 'some text is tiny',
      })
    }

    const targets = phone.inspection.smallTargets
    if (targets.length >= 3) {
      const selectors = [...new Set(targets.map((t) => t.selector))].slice(0, 3)
      const pin = pinFor('phone', targets[0]!.box, phone.screenshotSize)
      drafts.push({
        kind: 'broken',
        severity: targets.length >= 10 ? 'kinda sus' : 'meh',
        title: `${targets.length}${targets.length >= 30 ? '+' : ''} buttons and links are too small to tap`,
        where: 'on screenshot',
        location: selectors.join(', '),
        whatsUp: `Targets like ${targets[0]!.text ? `“${targets[0]!.text.slice(0, 30)}”` : `\`${targets[0]!.selector}\``} are only ${targets[0]!.width}×${targets[0]!.height}px. Fingers need about 44×44px to hit them reliably.`,
        fix: 'Give tappable things a bigger hit area. Padding works as well as size.',
        code: cssBlock(selectors.join(',\n'), ['min-width: 44px', 'min-height: 44px', 'display: inline-flex', 'align-items: center', 'justify-content: center']),
        codeLang: 'css',
        devices: ['phone'],
        pins: pin ? [pin] : [],
        short: 'buttons are too small to tap',
      })
    }
  }

  // Stretched and broken images.
  drafts.push(
    ...mergeByKey(
      layouts.flatMap((layout) => {
        const stretched = layout.inspection.images.filter((i) => i.stretched)
        if (!stretched.length) return []
        return [
          {
            key: 'stretched',
            device: layout.device,
            pin: pinFor(layout.device, stretched[0]!.box, layout.screenshotSize),
            build: (devices: Device[]): Draft => ({
              kind: 'broken',
              severity: 'kinda sus',
              title: `${plural(stretched.length, 'image')} ${stretched.length === 1 ? 'looks' : 'look'} squashed or stretched${onDevices(devices)}`,
              where: 'on screenshot',
              location: fileName(stretched[0]!.src),
              whatsUp: 'The image is shown at a different shape than the file, so it gets distorted.',
              fix: 'Let the image crop to fit instead of stretching.',
              code: cssBlock([...new Set(stretched.map((s) => s.selector))].slice(0, 3).join(',\n'), ['object-fit: cover']),
              codeLang: 'css',
              devices,
              pins: [],
              short: 'images look stretched',
            }),
          },
        ]
      }),
    ),
  )

  const brokenImages = [...new Map(layouts.flatMap((l) => l.inspection.images.filter((i) => i.broken)).map((i) => [i.src, i])).values()]
  if (brokenImages.length) {
    drafts.push({
      kind: 'broken',
      severity: 'kinda sus',
      title: `${plural(brokenImages.length, 'image')} ${brokenImages.length === 1 ? 'doesn’t' : 'don’t'} load`,
      where: 'on screenshot',
      location: brokenImages
        .slice(0, 3)
        .map((i) => displayPath(i.src, pageUrl))
        .join(', '),
      whatsUp: 'Visitors see a broken-image icon or an empty gap where these should be.',
      fix: 'Check the file paths and that the files were uploaded. Paths are case-sensitive on most servers.',
      code: null,
      codeLang: null,
      devices: ['phone', 'laptop'],
      pins: layouts.flatMap((l) => {
        const img = l.inspection.images.find((i) => i.broken)
        const pin = img && pinFor(l.device, img.box, l.screenshotSize)
        return pin ? [pin] : []
      }),
      short: 'some images are broken',
    })
  }

  // Unsized images cause the layout to jump as they load.
  if (speed.unsizedImages.items.length) {
    const cls = speed.metrics.CLS ?? 0
    const examples = speed.unsizedImages.items.slice(0, 3).map((item) => {
      const shown = layouts.flatMap((l) => l.inspection.images).find((i) => sameResource(i.src, item.url))
      const size = shown?.naturalWidth ? ` width="${shown.naturalWidth}" height="${shown.naturalHeight}"` : ' width="…" height="…"'
      return `<img src="${hrefFor(item.url, pageUrl)}"${size} alt="…">`
    })
    drafts.push({
      kind: 'broken',
      severity: cls > 0.25 ? 'big yikes' : cls > 0.1 ? 'kinda sus' : 'meh',
      title: `Add width and height to ${plural(speed.unsizedImages.items.length, 'image')}`,
      where: 'in your code',
      location: speed.unsizedImages.items[0]!.selector ?? 'img',
      whatsUp: `The browser doesn’t know how tall ${speed.unsizedImages.items.length === 1 ? 'this image is' : 'these images are'} until ${speed.unsizedImages.items.length === 1 ? 'it loads' : 'they load'}, so everything below jumps down when ${speed.unsizedImages.items.length === 1 ? 'it arrives' : 'they arrive'}.`,
      fix: 'Put the image’s real width and height on the tag. CSS can still resize it; the browser just reserves the right space.',
      code: `${examples.join('\n')}\n\n<style>\n  img { height: auto; }\n</style>`,
      codeLang: 'html',
      devices: ['phone', 'laptop'],
      pins: layouts
        .filter((l) => l.device === 'phone')
        .flatMap((l) => {
          const img = l.inspection.images.find((i) => sameResource(i.src, speed.unsizedImages.items[0]!.url))
          const pin = img && pinFor(l.device, img.box, l.screenshotSize)
          return pin ? [pin] : []
        }),
      short: 'content jumps as images load',
    })
  }

  // Content jumping for reasons other than unsized images.
  const cls = speed.metrics.CLS ?? 0
  if (cls > 0.1 && !speed.unsizedImages.items.length) {
    const movers = [...new Set(speed.layoutShifts.map((shift) => shift.selector))].slice(0, 3)
    drafts.push({
      kind: 'broken',
      severity: cls > 0.25 ? 'big yikes' : 'kinda sus',
      title: 'Content jumps around while the page loads',
      where: 'in your code',
      location: movers.join(', ') || 'page layout',
      whatsUp: `Things move after they first appear (layout shift score ${cls.toFixed(2)}; under 0.1 is good)${
        movers.length ? `. The biggest jumps come from ${movers.map((m) => `\`${m}\``).join(', ')}` : ''
      }. Visitors lose their place or tap the wrong thing.`,
      fix: 'Reserve space for anything that loads or appears later (a min-height or aspect-ratio), and animate with transform instead of changing top, margin, height or width.',
      code: movers[0] ? cssBlock(movers[0], ['min-height: 320px /* the size it ends up at */']) : null,
      codeLang: movers[0] ? 'css' : null,
      devices: ['phone', 'laptop'],
      pins: [],
      short: 'content jumps around',
    })
  }

  const brokenSrcs = new Set(brokenImages.map((i) => i.src))
  const failed = [...new Map(layouts.flatMap((l) => l.failedRequests).filter((r) => !brokenSrcs.has(r.url)).map((r) => [r.url, r])).values()]
  if (failed.length) {
    drafts.push({
      kind: 'broken',
      severity: 'kinda sus',
      title: `${plural(failed.length, 'file')} ${failed.length === 1 ? 'fails' : 'fail'} to load`,
      where: 'in your code',
      location: failed
        .slice(0, 3)
        .map((r) => `${displayPath(r.url, pageUrl)}${r.status ? ` (${r.status})` : ''}`)
        .join(', '),
      whatsUp: 'The page asks for these files but gets an error back, so whatever they power is missing or broken.',
      fix: 'Fix the paths, upload the missing files, or remove the tags that load them.',
      code: null,
      codeLang: null,
      devices: [...new Set(layouts.filter((l) => l.failedRequests.length).map((l) => l.device))],
      pins: [],
      short: 'some files fail to load',
    })
  }

  // Chrome logs every failed request as a console error too; those are already covered above.
  const errors = [...new Set(layouts.flatMap((l) => l.consoleErrors))].filter(
    (e) => !e.startsWith('Failed to load resource') && !failed.some((f) => e.includes(f.url)),
  )
  if (errors.length) {
    drafts.push({
      kind: 'broken',
      severity: 'meh',
      title: `The page throws ${plural(errors.length, 'JavaScript error')}`,
      where: 'in your code',
      location: errors[0]!.slice(0, 120),
      whatsUp: `Errors like “${errors[0]!.slice(0, 160)}” can stop menus, forms or sliders from working.`,
      fix: 'Open the page, press F12 and check the Console tab. Each error links to the line that caused it.',
      code: null,
      codeLang: null,
      devices: [...new Set(layouts.filter((l) => l.consoleErrors.length).map((l) => l.device))],
      pins: [],
      short: 'JavaScript errors',
    })
  }

  return drafts
}

// ---------- scores, vitals and weight ----------

const VITALS: Omit<Vital, 'value' | 'display' | 'rating'>[] = [
  { key: 'LCP', label: 'Largest Contentful Paint', description: 'when the main thing shows up', good: 2500, poor: 4000, goodLabel: 'good ≤ 2.5s', poorLabel: 'poor > 4s' },
  { key: 'CLS', label: 'Cumulative Layout Shift', description: 'how much stuff jumps', good: 0.1, poor: 0.25, goodLabel: 'good ≤ 0.1', poorLabel: 'poor > 0.25' },
  { key: 'TBT', label: 'Total Blocking Time', description: 'how long the page ignores taps', good: 200, poor: 600, goodLabel: 'good ≤ 200ms', poorLabel: 'poor > 600ms' },
  { key: 'FCP', label: 'First Contentful Paint', description: 'when anything shows up', good: 1800, poor: 3000, goodLabel: 'good ≤ 1.8s', poorLabel: 'poor > 3s' },
]

function vitals(speed: SpeedFindings): Vital[] {
  return VITALS.map((vital) => {
    const value = speed.metrics[vital.key]
    if (value === null) return { ...vital, value, display: '—', rating: 'unmeasured' }
    const display =
      vital.key === 'CLS' ? value.toFixed(2) : vital.key === 'TBT' ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`
    const rating = value <= vital.good ? 'good' : value <= vital.poor ? 'meh' : 'poor'
    return { ...vital, value, display, rating }
  })
}

function weight(speed: SpeedFindings, pageUrl: string): Report['weight'] {
  const categoryOf = (resourceType: string): WeightCategory =>
    ({ Image: 'Images', Script: 'JavaScript', Font: 'Fonts', Stylesheet: 'CSS' } as const)[resourceType] ?? 'Other'
  const totals = new Map<WeightCategory, number>()
  for (const r of speed.requests) totals.set(categoryOf(r.resourceType), (totals.get(categoryOf(r.resourceType)) ?? 0) + r.transferSize)
  const order: WeightCategory[] = ['Images', 'JavaScript', 'Fonts', 'CSS', 'Other']
  return {
    totalBytes: speed.requests.reduce((sum, r) => sum + r.transferSize, 0),
    categories: order.map((category) => ({ category, bytes: totals.get(category) ?? 0 })),
    heaviest: [...speed.requests]
      .filter((r) => r.transferSize > 0 && !r.url.startsWith('data:'))
      .sort((a, b) => b.transferSize - a.transferSize)
      .slice(0, 5)
      .map((r) => ({
        url: r.url,
        // Keep the query string so the same file loaded twice (hero.png?v=2) is told apart.
        path: displayPath(r.url, pageUrl) + (URL.canParse(r.url) ? new URL(r.url).search : ''),
        bytes: r.transferSize,
        category: categoryOf(r.resourceType),
      })),
  }
}

export function speedLabel(score: number) {
  return score >= 90 ? 'zooming' : score >= 50 ? 'kinda sluggish' : 'giving dial-up'
}

export function looksLabel(score: number) {
  return score >= 90 ? 'clean' : score >= 60 ? 'lowkey messy' : 'cursed'
}

/** Rounds gains so they add up to `total`, scaling them down proportionally if they overshoot. */
export function distribute(raw: number[], total: number) {
  const sum = raw.reduce((a, b) => a + b, 0)
  const scale = sum > total && sum > 0 ? total / sum : 1
  return raw.map((g) => Math.max(g > 0 ? 1 : 0, Math.round(g * scale)))
}

export function buildReport(
  requestedUrl: string,
  speed: SpeedFindings,
  layouts: LayoutFindings[],
  checkedAt: Date,
): Report {
  const pageUrl = speed.finalUrl || requestedUrl
  const slow = speedIssues(speed, layouts, pageUrl)
  const broken = looksIssues(layouts, pageUrl, speed)

  // Speed gains: rescore with each fix's savings applied, then make them add up to "fix everything".
  const fixed = (drafts: Draft[]) =>
    performanceScore(
      speed.scoring,
      applySavings(
        speed.scoring,
        Object.assign({}, speed.metrics, ...drafts.map((d) => d.assume ?? {})),
        drafts.map((d) => d.savings ?? {}),
      ),
    )
  const base = performanceScore(speed.scoring, speed.metrics)
  const allFixed = fixed(slow)
  const slowGains = distribute(
    slow.map((d) => fixed([d]) - base),
    Math.max(0, Math.min(100 - speed.score, allFixed - base)),
  )

  const looksPenalty = broken.map((d) => LOOKS_PENALTY[d.severity])
  const looksScore = Math.max(0, 100 - looksPenalty.reduce((a, b) => a + b, 0))
  const brokenGains = distribute(looksPenalty, 100 - looksScore)

  const drafts = [
    ...slow.map((draft, i) => ({ draft, gain: slowGains[i]! })),
    ...broken.map((draft, i) => ({ draft, gain: brokenGains[i]! })),
  ].sort((a, b) => b.gain - a.gain || SEVERITY_ORDER[a.draft.severity] - SEVERITY_ORDER[b.draft.severity])

  const issues: Issue[] = drafts.map(({ draft, gain }, i) => {
    const { short: _short, savings: _savings, assume: _assume, ...issue } = draft
    return { id: String(i + 1), gain, ...issue, codeLang: issue.codeLang as CodeLang | null }
  })

  const topSlow = drafts.filter((d) => d.draft.kind === 'slow').map((d) => d.draft.short)
  const topBroken = drafts.filter((d) => d.draft.kind === 'broken').map((d) => d.draft.short)
  const joinShort = (list: string[]) => [...new Set(list)].slice(0, 2).join(' and ')
  const phoneBroken = broken.filter((d) => d.devices.includes('phone')).length
  const laptopBroken = broken.filter((d) => d.devices.includes('laptop')).length

  const summary = [
    speed.score >= 90
      ? 'Your site loads fast on phones.'
      : topSlow.length
        ? `Your site loads slowly on phones mostly because of ${joinShort(topSlow)}.`
        : 'Your site loads slowly on phones, mostly from general page weight.',
    topBroken.length
      ? `It looks ${phoneBroken >= laptopBroken ? 'broken on phones' : 'off on laptops'} because ${joinShort(topBroken)}.`
      : 'Nothing looks broken on phones or laptops.',
  ].join(' ')

  return {
    source: 'url',
    url: requestedUrl,
    finalUrl: pageUrl,
    checkedAt: checkedAt.toISOString(),
    summary,
    speed: {
      score: speed.score,
      label: speedLabel(speed.score),
      note: slow.length ? `${plural(slow.length, 'problem')} slowing it down, measured on a phone.` : 'Nothing big slowing it down.',
    },
    looks: {
      score: looksScore,
      label: looksLabel(looksScore),
      note: !broken.length
        ? 'Looks right on phones and laptops.'
        : `${plural(broken.length, 'layout problem')}. ${
            laptopBroken === 0
              ? 'Laptop is fine, phones are not.'
              : phoneBroken === 0
                ? 'Phones are fine, laptop is not.'
                : 'Phones and laptops both need work.'
          }`,
    },
    vitals: vitals(speed),
    issues,
    fixedCode: null,
    weight: weight(speed, pageUrl),
    screenshots: Object.fromEntries(layouts.map((l) => [l.device, l.screenshotSize])) as Report['screenshots'],
  }
}

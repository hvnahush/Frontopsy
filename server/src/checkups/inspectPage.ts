/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// This function is serialized and run inside the checked page by Playwright, so it
// must be fully self-contained: no imports and no references to outer variables.

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** A declaration the site's own CSS applies to an element, e.g. `.nav { width: 1200px }`. */
export interface AuthoredRule {
  selector: string
  prop: string
  value: string
  source: string
}

export interface ElementInfo {
  selector: string
  box: Box
  position: string
  rules: AuthoredRule[]
}

export interface PageInspection {
  viewportWidth: number
  viewportHeight: number
  docWidth: number
  docHeight: number
  hasViewportMeta: boolean
  overflow: (ElementInfo & { text: string })[]
  covered: { coverer: ElementInfo; texts: { selector: string; text: string; box: Box }[] }[]
  tinyText: { selector: string; fontSize: number; text: string; box: Box }[]
  smallTargets: { selector: string; width: number; height: number; text: string; box: Box }[]
  /** Big elements whose CSS animation starts fully transparent, which can stop Chrome counting them as painted. */
  fadeIns: { selector: string; animation: string; box: Box }[]
  images: {
    src: string
    selector: string
    box: Box
    naturalWidth: number
    naturalHeight: number
    stretched: boolean
    broken: boolean
    hasSizeAttrs: boolean
  }[]
}

export function inspectPage(): PageInspection {
  const RULE_PROPS = [
    'width',
    'min-width',
    'max-width',
    'position',
    'left',
    'right',
    'top',
    'margin-left',
    'margin-right',
    'margin-top',
    'transform',
    'z-index',
    'font-size',
    'white-space',
  ]
  // Use the layout viewport: when something is wider than a phone screen, mobile Chrome
  // zooms out and window.innerWidth/innerHeight grow to match the zoomed-out view.
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const docWidth = document.documentElement.scrollWidth
  const zoomedOut = window.innerWidth > vw + 1
  const pageScrolls = !zoomedOut && document.documentElement.scrollHeight > vh + 1
  // For pages shorter than the screen, measure the content itself so screenshots
  // don't end in a big empty area.
  const bodyHeight = (document.body?.scrollHeight ?? 0) + 24
  const docHeight = pageScrolls
    ? Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)
    : Math.max(200, zoomedOut ? bodyHeight : Math.min(vh, bodyHeight))

  const styleCache = new Map<Element, CSSStyleDeclaration>()
  const style = (el: Element) => {
    let s = styleCache.get(el)
    if (!s) {
      s = getComputedStyle(el)
      styleCache.set(el, s)
    }
    return s
  }

  const box = (el: Element): Box => {
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
    }
  }

  const describe = (el: Element) => {
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return `#${el.id}`
    const tag = el.tagName.toLowerCase()
    const classes = [...el.classList].filter((c) => /^[a-zA-Z_-][\w-]*$/.test(c) && c.length <= 40).slice(0, 2)
    return classes.length ? `${tag}.${classes.join('.')}` : tag
  }

  const selectorFor = (el: Element) => {
    const own = describe(el)
    if (own.startsWith('#') || own.includes('.')) return own
    const parent = el.parentElement
    if (!parent || parent === document.body || parent === document.documentElement) return own
    return `${describe(parent)} > ${own}`
  }

  const textOf = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)

  const ownText = (el: Element) =>
    [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim()

  const isVisible = (el: Element) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    for (let c: Element | null = el; c; c = c.parentElement) {
      const s = style(c)
      if (s.display === 'none' || s.opacity === '0') return false
    }
    return style(el).visibility !== 'hidden'
  }

  const isPositioned = (el: Element) => ['absolute', 'fixed', 'sticky'].includes(style(el).position)

  const isFixedLike = (el: Element) => {
    for (let c: Element | null = el; c; c = c.parentElement) {
      if (style(c).position === 'fixed' || style(c).position === 'sticky') return true
    }
    return false
  }

  // Same-origin stylesheets only; the browser refuses to expose cross-origin rules.
  const styleRules: { rule: CSSStyleRule; source: string }[] = []
  const invisibleStarts = new Set<string>()
  const collectRules = (rules: CSSRuleList, source: string) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) styleRules.push({ rule, source })
      else if (rule instanceof CSSKeyframesRule) {
        const first = [...rule.cssRules].find(
          (frame) => frame instanceof CSSKeyframeRule && /(^|,)\s*(from|0%)\s*(,|$)/.test(frame.keyText),
        ) as CSSKeyframeRule | undefined
        if (first && parseFloat(first.style.opacity) === 0) invisibleStarts.add(rule.name)
      }
      else if (rule instanceof CSSMediaRule) {
        if (window.matchMedia(rule.conditionText).matches) collectRules(rule.cssRules, source)
      } else if (rule instanceof CSSSupportsRule || rule instanceof CSSLayerBlockRule) {
        collectRules(rule.cssRules, source)
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      const href = sheet.href ? new URL(sheet.href).pathname.split('/').pop() || sheet.href : 'inline <style>'
      collectRules(sheet.cssRules, href)
    } catch {
      // Cross-origin stylesheet.
    }
  }

  const rulesFor = (el: Element): AuthoredRule[] => {
    const found: AuthoredRule[] = []
    for (const { rule, source } of styleRules) {
      let matches = false
      try {
        matches = el.matches(rule.selectorText)
      } catch {
        continue
      }
      if (!matches) continue
      for (const prop of RULE_PROPS) {
        const value = rule.style.getPropertyValue(prop)
        if (value) found.push({ selector: rule.selectorText, prop, value, source })
      }
    }
    const inline = (el as HTMLElement).style
    for (const prop of RULE_PROPS) {
      const value = inline?.getPropertyValue(prop)
      if (value) found.push({ selector: 'style=""', prop, value, source: 'inline style' })
    }
    return found
  }

  const info = (el: Element): ElementInfo => ({
    selector: selectorFor(el),
    box: box(el),
    position: style(el).position,
    rules: rulesFor(el),
  })

  const all = [...document.body.querySelectorAll('*')].filter(
    (el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'HEAD', 'META', 'LINK'].includes(el.tagName),
  )

  // 1. Things wider than the screen that make the page scroll sideways.
  const overflow: PageInspection['overflow'] = []
  if (docWidth > vw + 2) {
    const clipsX = (el: Element) => {
      for (let c = el.parentElement; c && c !== document.body && c !== document.documentElement; c = c.parentElement) {
        if (style(c).overflowX !== 'visible') return true
      }
      return false
    }
    const culprits = all.filter((el) => {
      const r = el.getBoundingClientRect()
      return r.right + window.scrollX > vw + 2 && r.width > 0 && style(el).position !== 'fixed' && !clipsX(el)
    })
    const culpritSet = new Set(culprits)
    culprits
      .filter((el) => !el.parentElement || !culpritSet.has(el.parentElement))
      .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
      .slice(0, 3)
      .forEach((el) => overflow.push({ ...info(el), text: textOf(el) }))
  }

  // 2. Text that something else is painted on top of.
  const textEls = all.filter((el) => ownText(el).length >= 2 && isVisible(el)).slice(0, 1500)
  const isPainted = (el: Element) => {
    const s = style(el)
    if (['IMG', 'VIDEO', 'CANVAS', 'svg', 'IFRAME', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return true
    if (s.backgroundImage !== 'none') return true
    const alpha = /rgba?\(([^)]+)\)/.exec(s.backgroundColor)?.[1]?.split(',')[3]
    if (s.backgroundColor !== 'transparent' && (alpha === undefined || parseFloat(alpha) > 0.1)) return true
    return ownText(el).length > 0
  }
  const covererGroups = new Map<Element, { selector: string; text: string; box: Box }[]>()
  const maxScroll = Math.min(docHeight, vh * 3)
  for (let top = 0; top < maxScroll; top += vh) {
    window.scrollTo(0, top)
    for (const el of textEls) {
      const r = el.getBoundingClientRect()
      if (r.top < 0 || r.top >= vh || r.bottom > vh) continue
      const firstLine = r.top + Math.min(r.height / 2, parseFloat(style(el).fontSize) * 0.6 || 8)
      const samples = [firstLine, r.top + r.height / 2].flatMap((y) => [0.2, 0.5, 0.8].map((fx) => [r.left + r.width * fx, y]))
      for (const [x, y] of samples) {
        if (x < 0 || x >= vw) continue
        const hit = document.elementFromPoint(x, y)
        if (!hit || el.contains(hit) || hit.contains(el)) continue

        // Walk up from what's on top to the element that actually causes the overlap:
        // the highest positioned ancestor that isn't also wrapping the covered text.
        let coverer: Element | null = null
        let painted = false
        for (let c: Element | null = hit; c && !c.contains(el); c = c.parentElement) {
          if (!isVisible(c)) {
            painted = false
            break
          }
          if (isPainted(c)) painted = true
          if (isPositioned(c) || !coverer) coverer = c
        }
        if (!coverer || !painted) continue
        // Once scrolled, sticky headers are supposed to sit over content.
        if (top > 0 && isFixedLike(coverer)) continue

        const group = covererGroups.get(coverer) ?? []
        if (!group.some((t) => t.selector === selectorFor(el) && t.text === ownText(el).slice(0, 80))) {
          group.push({ selector: selectorFor(el), text: ownText(el).slice(0, 80), box: box(el) })
        }
        covererGroups.set(coverer, group)
        break
      }
    }
  }
  window.scrollTo(0, 0)
  const covered = [...covererGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([coverer, texts]) => ({ coverer: info(coverer), texts: texts.slice(0, 5) }))

  // 3. Text too small to read comfortably on a phone.
  const tinyText = textEls
    .filter((el) => parseFloat(style(el).fontSize) < 12 && ownText(el).length >= 3)
    .slice(0, 20)
    .map((el) => ({ selector: selectorFor(el), fontSize: parseFloat(style(el).fontSize), text: ownText(el).slice(0, 60), box: box(el) }))

  // 4. Buttons and links too small to tap. Links inside a sentence are exempt.
  const smallTargets = [...document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select')]
    .filter((el) => {
      if (!isVisible(el)) return false
      const r = el.getBoundingClientRect()
      if (r.width >= 24 && r.height >= 24) return false
      return !(el.tagName === 'A' && el.parentElement && ownText(el.parentElement).length > 0)
    })
    .slice(0, 30)
    .map((el) => {
      const r = el.getBoundingClientRect()
      return {
        selector: selectorFor(el),
        width: Math.round(r.width),
        height: Math.round(r.height),
        text: textOf(el) || el.getAttribute('aria-label') || '',
        box: box(el),
      }
    })

  // 5. Large areas that fade in from opacity 0. Chrome may never record a
  // "contentful" paint for them, so Google can't time when the page appears.
  const fadeIns = all
    .filter((el) => {
      const names = style(el).animationName.split(',').map((n) => n.trim())
      if (!names.some((n) => invisibleStarts.has(n))) return false
      const r = el.getBoundingClientRect()
      return r.width * r.height > vw * vh * 0.15
    })
    .filter((el, _i, list) => !list.some((other) => other !== el && other.contains(el)))
    .slice(0, 3)
    .map((el) => ({
      selector: selectorFor(el),
      box: box(el),
      animation: style(el).animationName.split(',').map((n) => n.trim()).filter((n) => invisibleStarts.has(n)).join(', '),
    }))

  // 6. Images: broken, stretched, missing size attributes.
  const images = [...document.images]
    .filter((img) => isVisible(img) || (img.complete && img.naturalWidth === 0 && img.getAttribute('src')))
    .slice(0, 100)
    .map((img) => {
      const r = img.getBoundingClientRect()
      const naturalRatio = img.naturalWidth / img.naturalHeight
      const shownRatio = r.width / r.height
      return {
        src: img.currentSrc || img.src,
        selector: selectorFor(img),
        box: box(img),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        stretched:
          style(img).objectFit === 'fill' &&
          img.naturalWidth > 0 &&
          r.width * r.height > 2000 &&
          Math.abs(shownRatio / naturalRatio - 1) > 0.08,
        broken: img.complete && img.naturalWidth === 0 && Boolean(img.getAttribute('src')),
        hasSizeAttrs: img.hasAttribute('width') && img.hasAttribute('height'),
      }
    })

  return {
    viewportWidth: vw,
    viewportHeight: vh,
    docWidth,
    docHeight,
    hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
    overflow,
    covered,
    tinyText,
    smallTargets,
    fadeIns,
    images,
  }
}

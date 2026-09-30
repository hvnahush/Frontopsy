// The report shape returned by the API. The frontend mirrors these types in
// frontopsy/src/features/checkups/types.ts, so keep the two in sync.

export type Device = 'phone' | 'laptop'
export type IssueKind = 'slow' | 'broken'
export type Severity = 'big yikes' | 'kinda sus' | 'meh'
export type Rating = 'good' | 'meh' | 'poor' | 'unmeasured'
export type CodeLang = 'html' | 'css' | 'js' | 'shell'

/** A spot on a device screenshot, as fractions (0–1) of the screenshot's width and height. */
export interface Pin {
  device: Device
  x: number
  y: number
}

export interface Issue {
  id: string
  kind: IssueKind
  severity: Severity
  title: string
  /** Where it shows up: 'in your code' for things you only see in the source, 'on screenshot' for visible problems. */
  where: 'in your code' | 'on screenshot'
  /** A file, selector or tag the problem points at, shown in monospace. */
  location: string
  whatsUp: string
  fix: string
  code: string | null
  codeLang: CodeLang | null
  /** Estimated points this fix adds to the speed (slow issues) or looks (broken issues) score. */
  gain: number
  devices: Device[]
  pins: Pin[]
}

export interface Vital {
  key: 'LCP' | 'CLS' | 'TBT' | 'FCP'
  label: string
  description: string
  /** Null when the metric couldn't be measured. */
  value: number | null
  display: string
  rating: Rating
  good: number
  poor: number
  goodLabel: string
  poorLabel: string
}

export type WeightCategory = 'Images' | 'JavaScript' | 'Fonts' | 'CSS' | 'Other'

export type CheckupSource = 'url' | 'code' | 'screenshot'

export interface Report {
  /**
   * 'url' reports come from loading a live site, 'code' from rendering pasted code and asking
   * Gemini, and 'screenshot' from Gemini looking at an uploaded image.
   */
  source: CheckupSource
  url: string
  finalUrl: string
  checkedAt: string
  summary: string
  /** Null for screenshot reports: speed can't be judged from a picture. */
  speed: { score: number; label: string; note: string } | null
  looks: { score: number; label: string; note: string }
  /** Empty for code reports: there's no real page load to time. */
  vitals: Vital[]
  issues: Issue[]
  /** The pasted code with every fix applied (code reports only). */
  fixedCode: string | null
  /** Null for code reports. */
  weight: {
    totalBytes: number
    categories: { category: WeightCategory; bytes: number }[]
    heaviest: { url: string; path: string; bytes: number; category: WeightCategory }[]
  } | null
  /** Missing for a device when nothing could be rendered (e.g. a CSS-only or React paste). */
  screenshots: Partial<Record<Device, { width: number; height: number }>>
}

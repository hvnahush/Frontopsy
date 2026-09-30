import type { IssueKind, Rating, Severity, WeightCategory } from '../../features/checkups/types'

export const PINK = '#ff2f8b'
export const BLUE = '#4a5df9'
export const YELLOW = '#ffc93d'
export const LIME = '#c6ff3d'
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const SEVERITY_COLOR: Record<Severity, string> = { 'big yikes': PINK, 'kinda sus': YELLOW, meh: LIME }
export const RATING_COLOR: Record<Rating, string> = { good: LIME, meh: YELLOW, poor: PINK, unmeasured: '#fff' }
export const KIND_COLOR: Record<IssueKind, string> = { slow: '#dfe3ff', broken: '#ffd9e9' }
export const CATEGORY_COLOR: Record<WeightCategory, string> = {
  Images: PINK,
  JavaScript: BLUE,
  Fonts: YELLOW,
  CSS: LIME,
  Other: '#fff',
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / 1024))} KB`
}

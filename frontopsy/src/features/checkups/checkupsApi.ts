import { apiUrl, post, request } from '../../app/apiClient'
import type { Checkup, CheckupSummary, Device } from './types'

export type CheckupInput =
  | { url: string }
  | { code: string; symptoms: string[] }
  /** `screenshot` is a data URL of a PNG, JPG or WebP image. */
  | { screenshot: string; symptoms: string[] }

export async function startCheckup(input: CheckupInput): Promise<Checkup> {
  const { checkup } = await post<{ checkup: Checkup }>('/checkups', input)
  return checkup
}

export async function fetchCheckup(id: string): Promise<Checkup> {
  const { checkup } = await request<{ checkup: Checkup }>(`/checkups/${encodeURIComponent(id)}`)
  return checkup
}

export async function fetchCheckups(): Promise<CheckupSummary[]> {
  const { checkups } = await request<{ checkups: CheckupSummary[] }>('/checkups')
  return checkups
}

export function screenshotUrl(id: string, device: Device) {
  return apiUrl(`/checkups/${encodeURIComponent(id)}/screenshots/${device}`)
}

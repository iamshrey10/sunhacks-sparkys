import type { LatLng, Prefs, RouteRequest } from './types'

export type PickTarget = 'start' | 'end'

export interface FormValue {
  start: LatLng | null
  end: LatLng | null
  /** "HH:MM", local Tempe time. */
  departTime: string
  prefs: Prefs
}

export const DEFAULT_TIME = '15:00'

/** Returns a valid RouteRequest, or null while start or end is missing. */
export function buildRequest(v: FormValue): RouteRequest | null {
  if (!v.start || !v.end || !/^\d{2}:\d{2}$/.test(v.departTime)) return null
  return {
    start: v.start,
    end: v.end,
    depart_time: v.departTime,
    prefs: v.prefs,
  }
}

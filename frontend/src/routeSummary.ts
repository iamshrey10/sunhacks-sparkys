import type { RouteResponse } from './types'

export const minutes = (s: number) => Math.round(s / 60)

/** Minutes for display: one decimal under 10 ("7.6"), whole minutes above. */
export function formatMin(s: number): string {
  const m = s / 60
  return m < 10 ? String(Math.round(m * 10) / 10) : String(Math.round(m))
}

export interface Verdict {
  /** Seconds of direct sun the coolest route saves (can be zero or negative). */
  sunSavedS: number
  /** Extra walking seconds on the coolest route (can be negative). */
  extraS: number
  /** Share of the fastest route's sun time that is saved, in percent. */
  sunSavedPct: number
  /** Cooler by a real margin: at least a minute and at least 8% less sun. */
  meaningful: boolean
}

/** Everything here comes straight from the route response. */
export function verdict(route: RouteResponse): Verdict {
  const { fastest, coolest } = route
  const sunSavedS = fastest.sun_exposed_s - coolest.sun_exposed_s
  const sunSavedPct = (sunSavedS / Math.max(fastest.sun_exposed_s, 1)) * 100
  return {
    sunSavedS,
    extraS: coolest.duration_s - fastest.duration_s,
    sunSavedPct,
    meaningful: sunSavedS >= 60 && sunSavedPct >= 8,
  }
}

/** "+1 min walk", "same walking time" or "-1 min walk". */
export function extraWalkText(extraS: number): string {
  if (Math.abs(extraS) < 30) return 'same walking time'
  const m = Math.round(extraS / 60)
  return m > 0 ? `+${m} min walk` : `${m} min walk`
}

/** One-line comparison, e.g. "Coolest route: +1 min walk, 7.6 min less in the sun". */
export function summaryText(route: RouteResponse): string {
  const v = verdict(route)
  if (!v.meaningful) {
    return 'Not much cooler here: the fastest route is a good choice'
  }
  return `Coolest route: ${extraWalkText(v.extraS)}, ${formatMin(v.sunSavedS)} min less in the sun`
}

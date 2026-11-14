import type { RouteResponse } from './types'

export const minutes = (s: number) => Math.round(s / 60)

/** One-line comparison, e.g. "Coolest route: same time, 2 min less in the sun". */
export function summaryText(route: RouteResponse): string {
  const { fastest, coolest } = route
  const extra = minutes(coolest.duration_s) - minutes(fastest.duration_s)
  const sunSaved = minutes(fastest.sun_exposed_s) - minutes(coolest.sun_exposed_s)
  const extraText =
    extra > 0 ? `+${extra} min` : extra < 0 ? `${extra} min` : 'same time'
  return `Coolest route: ${extraText}, ${sunSaved} min less in the sun`
}

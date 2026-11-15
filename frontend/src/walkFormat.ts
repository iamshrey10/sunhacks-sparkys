import type { NearbyPlace } from './types'

/** "restaurant", "fast_food", "historic:yes" -> "Restaurant", "Fast food", "Sight". */
export function placeKindLabel(place: NearbyPlace): string {
  if (place.kind.startsWith('historic:')) return 'Historic site'
  const text = place.kind.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Walking distance a person can read at a glance: "40 m", "1.2 km". */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m < 1 ? 'under 1 min' : `${m} min`
}

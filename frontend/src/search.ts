import { PLACES, type PlaceKind } from './data/places'
import type { Resource } from './types'

export interface PlaceResult {
  id: string
  name: string
  kind: PlaceKind
  lat: number
  lng: number
  outsideRoutes?: boolean
  /** Character range of the name that matched the query, for highlighting. */
  match: [number, number] | null
}

export const MAX_RESULTS = 6

/** DOM id of result row `index`, for aria-activedescendant. */
export const optionId = (listboxId: string, index: number) =>
  `${listboxId}-opt-${index}`

const RESOURCE_KIND: Record<Resource['kind'], PlaceKind> = {
  water: 'water',
  cooling_center: 'cooling',
  library: 'library',
  transit: 'transit',
  other: 'other',
}

interface Candidate {
  id: string
  name: string
  aliases: string[]
  kind: PlaceKind
  lat: number
  lng: number
  outsideRoutes?: boolean
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Higher is a better match; 0 means no match. */
function score(q: string, c: Candidate): number {
  const name = norm(c.name)
  if (name === q) return 100
  if (name.startsWith(q)) return 90
  if (name.split(' ').some((w) => w.startsWith(q))) return 80
  const aliases = c.aliases.map(norm)
  if (aliases.some((a) => a === q)) return 75
  if (aliases.some((a) => a.startsWith(q))) return 70
  if (name.includes(q)) return 60
  if (aliases.some((a) => a.includes(q))) return 50
  // Every typed word starts some word of the name or an alias ("fitness devil").
  const words = [name, ...aliases].join(' ').split(' ')
  const tokens = q.split(' ')
  if (tokens.length > 1 && tokens.every((t) => words.some((w) => w.startsWith(t)))) {
    return 40
  }
  return 0
}

function highlight(query: string, name: string): [number, number] | null {
  const q = query.trim().toLowerCase()
  const at = name.toLowerCase().indexOf(q)
  return at >= 0 ? [at, at + q.length] : null
}

/**
 * Find places matching a typed query: the built-in demo-area list first, then
 * (when given) the water and cooling spots from Help now.
 *
 * Async on purpose. Right now it searches local data only; the frontend must
 * not call a third-party geocoder directly. Later a backend geocoder can be
 * merged in here, behind this same function.
 * TODO: needs a backend /geocode endpoint; ask Shreyas.
 */
export async function searchPlaces(
  query: string,
  extra: { resources?: Resource[] } = {},
): Promise<PlaceResult[]> {
  const q = norm(query)
  if (!q) return []
  const candidates: Candidate[] = [
    ...PLACES,
    ...(extra.resources ?? []).map((r) => ({
      id: `resource-${r.id}`,
      name: r.name,
      aliases: [],
      kind: RESOURCE_KIND[r.kind],
      lat: r.location.lat,
      lng: r.location.lng,
    })),
  ]
  return candidates
    .map((c) => ({ c, s: score(q, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))
    .slice(0, MAX_RESULTS)
    .map(({ c }) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      lat: c.lat,
      lng: c.lng,
      outsideRoutes: c.outsideRoutes,
      match: highlight(query, c.name),
    }))
}

// Mirrors backend/api/schemas.py. Keep in sync with docs/API_CONTRACT.md.

export interface LatLng {
  lat: number
  lng: number
}

export interface Prefs {
  avoid_stairs: boolean
  heat_sensitivity: 'low' | 'normal' | 'high'
  /** 0 = fastest route, 1 = coolest route regardless of length. */
  shade_weight: number
}

export interface RouteRequest {
  start: LatLng
  end: LatLng
  /** Local Tempe time, "HH:MM". */
  depart_time: string
  prefs: Prefs
}

export interface RouteOption {
  kind: 'fastest' | 'coolest'
  /** [lat, lng] pairs in walking order. */
  geometry: [number, number][]
  distance_m: number
  duration_s: number
  /** 0-100 */
  shade_pct: number
  sun_exposed_s: number
  stairs_count: number
}

export interface RouteResponse {
  fastest: RouteOption
  coolest: RouteOption
  depart_time: string
  shade_layer: string
  source: 'model'
}

export type ResourceKind =
  | 'water'
  | 'cooling_center'
  | 'library'
  | 'transit'
  | 'other'

export interface Resource {
  id: string
  name: string
  kind: ResourceKind
  location: LatLng
  address: string | null
  /** null means unknown. Never show a guess as fact. */
  open_now: boolean | null
  hours_text: string | null
  source_url: string | null
  last_checked: string | null
  distance_m: number | null
}

export interface ResourcesResponse {
  resources: Resource[]
  generated_at: string
}

export interface ParseResponse {
  depart_time: string | null
  destination_text: string | null
  prefs: Prefs
}

export interface ExplainResponse {
  text: string
}

export const DEFAULT_PREFS: Prefs = {
  avoid_stairs: false,
  heat_sensitivity: 'normal',
  shade_weight: 0.7,
}

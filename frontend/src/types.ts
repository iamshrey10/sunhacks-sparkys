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

export type Maneuver =
  | 'depart'
  | 'continue'
  | 'slight_left'
  | 'slight_right'
  | 'left'
  | 'right'
  | 'sharp_left'
  | 'sharp_right'
  | 'u_turn'
  | 'stairs'
  | 'arrive'

export interface DirectionStep {
  instruction: string
  maneuver: Maneuver
  /** null where OpenStreetMap has no street name. */
  street: string | null
  /** Where this step begins. */
  location: LatLng
  /** Metres walked before this step begins. */
  start_along_m: number
  distance_m: number
  duration_s: number
  /** 0-100 */
  shade_pct: number
  stairs: boolean
}

export type PlaceGroup = 'food' | 'cafe' | 'drinks' | 'sight'

export interface NearbyPlace {
  id: string
  name: string
  group: PlaceGroup
  /** OpenStreetMap value, e.g. "restaurant". */
  kind: string
  location: LatLng
  /** Unverified OpenStreetMap text. Never present it as "open now". */
  listed_hours: string | null
  source_url: string
  /** From the route in /directions, from you in /track. */
  distance_m: number
  along_route_m: number
  /** Only in /track: the place's closest point on the route is still ahead. */
  ahead: boolean | null
}

export interface DirectionsRequest {
  route: RouteRequest
  kind?: 'fastest' | 'coolest'
}

export interface DirectionsResponse {
  kind: 'fastest' | 'coolest'
  steps: DirectionStep[]
  distance_m: number
  duration_s: number
  places: NearbyPlace[]
  shade_layer: string
}

export interface TrackRequest {
  /** RouteOption.geometry of the route being walked. */
  geometry: [number, number][]
  position: LatLng
  /** progress_m from the previous response. */
  last_progress_m?: number | null
  /** 20-500, default 120. */
  radius_m?: number
}

export interface TrackResponse {
  progress_m: number
  remaining_m: number
  remaining_s: number
  distance_from_route_m: number
  /** More than 35 m from the route: request a new route from here. */
  off_route: boolean
  arrived: boolean
  nearby: NearbyPlace[]
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

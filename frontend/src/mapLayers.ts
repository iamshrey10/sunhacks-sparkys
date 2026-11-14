export type MapType = 'standard' | 'light' | 'satellite'

export interface MapPrefs {
  type: MapType
  /** Water and cooling-spot markers (the Help now results). */
  spots: boolean
  /** Off shows only the coolest (recommended) route. */
  bothRoutes: boolean
  /** Place labels. Only the Satellite map can hide them; the others draw them in the tiles. */
  labels: boolean
}

export const DEFAULT_MAP_PREFS: MapPrefs = {
  type: 'light',
  spots: true,
  bothRoutes: true,
  labels: true,
}

export interface TileSpec {
  label: string
  url: string
  attribution: string
  maxZoom: number
  /** CSS class put on the tile layer's container, for styling it (see index.css). */
  className?: string
}

const OSM = '&copy; OpenStreetMap contributors'
const ESRI = 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'

// No API keys: every endpoint here works without one. (CARTO's free basemap
// endpoints now answer with an "API KEY REQUIRED" picture, so they are not used.)
export const BASE_LAYERS: Record<MapType, TileSpec> = {
  standard: {
    label: 'Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM,
    maxZoom: 19,
  },
  // The same OpenStreetMap tiles, softened to a calm pale basemap with CSS.
  light: {
    label: 'Light',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM,
    maxZoom: 19,
    className: 'tiles-light',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI,
    maxZoom: 19,
  },
}

const ESRI_REFERENCE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference'

/**
 * Street and place names drawn over the satellite imagery: Esri's own reference
 * layers (light text with a dark outline, made for imagery). Streets and places
 * are separate layers, shown together under the one "Place labels" switch.
 */
export const SATELLITE_LABELS: TileSpec[] = [
  {
    label: 'Street names',
    url: `${ESRI_REFERENCE}/World_Transportation/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI,
    maxZoom: 19,
  },
  {
    label: 'Place names',
    url: `${ESRI_REFERENCE}/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI,
    maxZoom: 19,
  },
]

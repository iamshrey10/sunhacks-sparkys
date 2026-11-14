import type {
  DirectionsRequest,
  DirectionsResponse,
  ExplainResponse,
  LatLng,
  ParseResponse,
  Prefs,
  ResourcesResponse,
  RouteRequest,
  RouteResponse,
  TrackRequest,
  TrackResponse,
} from './types'
import routeSample from './mocks/route_response.sample.json'
import resourcesSample from './mocks/resources_response.sample.json'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/** When true, route and resources come from bundled sample data. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

const mock = <T>(data: unknown) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data as T), 300))

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, String(detail))
  }
  return res.json() as Promise<T>
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  health: () =>
    request<{
      status: 'ok'
      gemini_configured: boolean
      tinyfish_configured: boolean
    }>('/health'),
  route: (req: RouteRequest) =>
    USE_MOCKS
      ? mock<RouteResponse>(routeSample)
      : post<RouteResponse>('/route', req),
  /** Turn-by-turn steps for a route. Needs the live API (no sample data). */
  directions: (req: DirectionsRequest) =>
    USE_MOCKS
      ? Promise.reject(new ApiError(501, 'Directions need the live API'))
      : post<DirectionsResponse>('/directions', req),
  /** Progress along a route for one GPS fix. Needs the live API. */
  track: (req: TrackRequest) =>
    USE_MOCKS
      ? Promise.reject(new ApiError(501, 'Tracking needs the live API'))
      : post<TrackResponse>('/track', req),
  resources: (center: LatLng, radiusM = 1500) =>
    USE_MOCKS
      ? mock<ResourcesResponse>(resourcesSample)
      : request<ResourcesResponse>(
          `/resources?lat=${center.lat}&lng=${center.lng}&radius_m=${radiusM}`,
        ),
  parse: (text: string) => post<ParseResponse>('/parse', { text }),
  explain: (route: RouteResponse, prefs: Prefs) =>
    post<ExplainResponse>('/explain', { route, prefs }),
}

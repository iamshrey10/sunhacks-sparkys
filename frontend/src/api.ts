import type {
  ExplainResponse,
  LatLng,
  ParseResponse,
  Prefs,
  ResourcesResponse,
  RouteRequest,
  RouteResponse,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
  route: (req: RouteRequest) => post<RouteResponse>('/route', req),
  resources: (center: LatLng, radiusM = 1500) =>
    request<ResourcesResponse>(
      `/resources?lat=${center.lat}&lng=${center.lng}&radius_m=${radiusM}`,
    ),
  parse: (text: string) => post<ParseResponse>('/parse', { text }),
  explain: (route: RouteResponse, prefs: Prefs) =>
    post<ExplainResponse>('/explain', { route, prefs }),
}

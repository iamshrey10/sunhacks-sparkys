import { useEffect, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { api, USE_MOCKS } from './api'
import SampleBadge from './components/SampleBadge'
import { DEFAULT_PREFS, type RouteResponse } from './types'

// ASU Tempe campus.
const TEMPE_CENTER: [number, number] = [33.4194, -111.9341]

type ApiState = 'checking' | 'online' | 'offline'

export default function App() {
  const [apiState, setApiState] = useState<ApiState>(
    USE_MOCKS ? 'offline' : 'checking',
  )
  const [route, setRoute] = useState<RouteResponse | null>(null)

  useEffect(() => {
    if (!USE_MOCKS) {
      api
        .health()
        .then(() => setApiState('online'))
        .catch(() => setApiState('offline'))
    }
    api
      .route({
        start: { lat: 33.4166, lng: -111.934 },
        end: { lat: 33.4217, lng: -111.94 },
        depart_time: '15:00',
        prefs: DEFAULT_PREFS,
      })
      .then(setRoute)
      .catch(() => setRoute(null))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h1 className="text-lg font-semibold">Cool Route</h1>
        <div className="flex items-center gap-3">
          <SampleBadge />
          <span
            className={
              apiState === 'online'
                ? 'text-sm text-emerald-400'
                : 'text-sm text-slate-400'
            }
          >
            API: {apiState}
          </span>
        </div>
      </header>
      {route && (
        <p className="px-4 pb-2 text-sm">
          Fastest {Math.round(route.fastest.duration_s / 60)} min, coolest{' '}
          {Math.round(route.coolest.duration_s / 60)} min (
          {route.coolest.shade_pct}% shade)
        </p>
      )}
      <main className="min-h-0 flex-1">
        <MapContainer
          center={TEMPE_CENTER}
          zoom={15}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      </main>
    </div>
  )
}

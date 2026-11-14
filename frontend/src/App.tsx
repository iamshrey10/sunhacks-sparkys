import { useEffect, useState } from 'react'
import { api, USE_MOCKS } from './api'
import RouteForm from './components/RouteForm'
import { DEFAULT_TIME, type FormValue, type PickTarget } from './form'
import RouteMap from './components/RouteMap'
import SampleBadge from './components/SampleBadge'
import {
  DEFAULT_PREFS,
  type LatLng,
  type RouteRequest,
  type RouteResponse,
} from './types'

type ApiState = 'checking' | 'online' | 'offline'

export default function App() {
  const [apiState, setApiState] = useState<ApiState>(
    USE_MOCKS ? 'offline' : 'checking',
  )
  const [form, setForm] = useState<FormValue>({
    start: null,
    end: null,
    departTime: DEFAULT_TIME,
    prefs: DEFAULT_PREFS,
  })
  const [picking, setPicking] = useState<PickTarget | null>(null)
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCKS) return
    api
      .health()
      .then(() => setApiState('online'))
      .catch(() => setApiState('offline'))
  }, [])

  const handleMapClick = (point: LatLng) => {
    if (!picking) return
    setForm((f) => ({ ...f, [picking]: point }))
    // After setting the start, move on to the end.
    setPicking(picking === 'start' && !form.end ? 'end' : null)
  }

  const findRoute = (req: RouteRequest) => {
    setLoading(true)
    setError(null)
    api
      .route(req)
      .then(setRoute)
      .catch(() => {
        setRoute(null)
        setError('We could not get a route right now. Please try again.')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 bg-sky-950 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Cool Route</h1>
        <div className="flex items-center gap-3">
          <SampleBadge />
          <span className="text-sm text-sky-100">API: {apiState}</span>
        </div>
      </header>
      <main className="min-h-[35%] flex-1">
        <RouteMap
          start={form.start}
          end={form.end}
          picking={picking}
          onMapClick={handleMapClick}
        />
      </main>
      <section className="max-h-[55%] overflow-y-auto bg-white px-4 py-3 text-slate-900 shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <RouteForm
          value={form}
          onChange={setForm}
          picking={picking}
          onPick={setPicking}
          onSubmit={findRoute}
          loading={loading}
        />
        {error && (
          <p role="alert" className="mt-3 font-medium text-red-800">
            {error}
          </p>
        )}
        {route && (
          <p className="mt-3 text-sm">
            Fastest {Math.round(route.fastest.duration_s / 60)} min, coolest{' '}
            {Math.round(route.coolest.duration_s / 60)} min (
            {route.coolest.shade_pct}% shade)
          </p>
        )}
      </section>
    </div>
  )
}

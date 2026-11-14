import { useEffect, useRef, useState } from 'react'
import { api, USE_MOCKS } from './api'
import RouteForm from './components/RouteForm'
import { DEFAULT_TIME, buildRequest, type FormValue, type PickTarget } from './form'
import ComparisonCard from './components/ComparisonCard'
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

  const panelRef = useRef<HTMLElement>(null)
  const request = buildRequest(form)

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
      .then((r) => {
        // Bring the first result into view above the form.
        if (!route) panelRef.current?.scrollTo({ top: 0 })
        setRoute(r)
      })
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
          route={route}
        />
      </main>
      <section
        ref={panelRef}
        className="max-h-[55%] overflow-y-auto bg-white px-4 py-3 text-slate-900 shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
      >
        {route && (
          <ComparisonCard
            route={route}
            shadeWeight={form.prefs.shade_weight}
            loading={loading}
            onShadeChange={(w) =>
              setForm((f) => ({ ...f, prefs: { ...f.prefs, shade_weight: w } }))
            }
            onShadeCommit={() => request && findRoute(request)}
          />
        )}
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
      </section>
    </div>
  )
}

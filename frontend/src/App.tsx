import { useEffect, useRef, useState } from 'react'
import { api, USE_MOCKS } from './api'
import AskBox from './components/AskBox'
import HelpNow from './components/HelpNow'
import RouteForm from './components/RouteForm'
import { DEFAULT_TIME, buildRequest, type FormValue, type PickTarget } from './form'
import ComparisonCard from './components/ComparisonCard'
import RouteMap from './components/RouteMap'
import SampleBadge from './components/SampleBadge'
import { usePrefs } from './hooks/usePrefs'
import {
  type LatLng,
  type ParseResponse,
  type Resource,
  type RouteRequest,
  type RouteResponse,
} from './types'

type ApiState = 'checking' | 'online' | 'offline'

export default function App() {
  const [apiState, setApiState] = useState<ApiState>(
    USE_MOCKS ? 'offline' : 'checking',
  )
  const [prefs, setPrefs] = usePrefs()
  const [trip, setTrip] = useState<Omit<FormValue, 'prefs'>>({
    start: null,
    end: null,
    departTime: DEFAULT_TIME,
  })
  const form: FormValue = { ...trip, prefs }
  // Trip details reset on reload; preferences are saved on this device.
  const setForm = (update: FormValue | ((f: FormValue) => FormValue)) => {
    const next = typeof update === 'function' ? update(form) : update
    setTrip({ start: next.start, end: next.end, departTime: next.departTime })
    setPrefs(next.prefs)
  }
  const [picking, setPicking] = useState<PickTarget | null>(null)
  const [tab, setTab] = useState<'route' | 'help'>('route')
  const [resources, setResources] = useState<Resource[]>([])
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
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

  const walkTo = (origin: LatLng, r: Resource) => {
    const next = { ...form, start: origin, end: r.location }
    setForm(next)
    setTab('route')
    const req = buildRequest(next)
    if (req) findRoute(req)
  }

  const applyParsed = (p: ParseResponse) =>
    setForm((f) => ({
      ...f,
      departTime: /^\d{2}:\d{2}$/.test(p.depart_time ?? '')
        ? (p.depart_time as string)
        : f.departTime,
      prefs: {
        ...f.prefs,
        avoid_stairs: p.prefs.avoid_stairs,
        heat_sensitivity: p.prefs.heat_sensitivity,
      },
    }))

  const findRoute = (req: RouteRequest) => {
    setLoading(true)
    setError(null)
    setExplanation(null)
    api
      .route(req)
      .then((r) => {
        // Bring the first result into view above the form.
        if (!route) panelRef.current?.scrollTo({ top: 0 })
        setRoute(r)
        // The explanation is optional: if it fails, the app works without it.
        // Never ask for one on sample data.
        if (!USE_MOCKS) {
          api
            .explain(r, req.prefs)
            .then((x) => setExplanation(x.text))
            .catch(() => {})
        }
      })
      .catch(() => {
        setRoute(null)
        setError('We could not get a route right now. Please try again.')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex h-full flex-col">
      <header className="bg-gradient-to-br from-sky-950 via-sky-900 to-teal-800 px-4 pb-4 pt-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="15" fill="#e0f2fe" />
              <circle cx="21" cy="11" r="5" fill="#f59e0b" />
              <path d="M4 26c4-9 10-13 24-12v12z" fill="#0c4a6e" opacity="0.85" />
            </svg>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Cool Route</h1>
              <p className="text-xs text-sky-100">The shadiest way to walk Tempe</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SampleBadge />
            <span className="text-xs text-sky-100">API: {apiState}</span>
          </div>
        </div>
        <nav
          className="mt-3 flex gap-1 rounded-xl bg-sky-950/60 p-1"
          aria-label="Screens"
        >
          {(['route', 'help'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`min-h-11 flex-1 rounded-lg text-sm font-bold transition-colors ${
                tab === t
                  ? 'bg-white text-sky-950 shadow'
                  : 'text-sky-100 hover:bg-sky-800'
              }`}
            >
              {t === 'route' ? 'Plan a route' : 'Help now'}
            </button>
          ))}
        </nav>
      </header>
      <main className="min-h-[35%] flex-1">
        <RouteMap
          start={form.start}
          end={form.end}
          picking={picking}
          onMapClick={handleMapClick}
          route={tab === 'route' ? route : null}
          resources={tab === 'help' ? resources : []}
        />
      </main>
      <section
        ref={panelRef}
        className="relative z-[1100] max-h-[55%] overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-2 text-slate-900 shadow-[0_-6px_20px_rgba(12,74,110,0.3)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        {tab === 'help' ? (
          <HelpNow
            resources={resources}
            onResources={(_origin, list) => setResources(list)}
            onWalk={walkTo}
          />
        ) : (
          <>
        {route && (
          <ComparisonCard
            route={route}
            shadeWeight={form.prefs.shade_weight}
            loading={loading}
            explanation={explanation}
            onShadeChange={(w) =>
              setForm((f) => ({ ...f, prefs: { ...f.prefs, shade_weight: w } }))
            }
            onShadeCommit={() => request && findRoute(request)}
          />
        )}
        <AskBox onParsed={applyParsed} />
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
          </>
        )}
      </section>
    </div>
  )
}

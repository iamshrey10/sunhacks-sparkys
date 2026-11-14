import { useEffect, useState } from 'react'
import { api, USE_MOCKS } from './api'
import AskBox from './components/AskBox'
import HelpNow from './components/HelpNow'
import RouteForm from './components/RouteForm'
import { DEFAULT_TIME, buildRequest, type FormValue, type PickTarget } from './form'
import BottomSheet, { type Snap } from './components/BottomSheet'
import ComparisonCard from './components/ComparisonCard'
import RouteMap from './components/RouteMap'
import SampleBadge from './components/SampleBadge'
import { summaryText } from './routeSummary'
import { usePrefs } from './hooks/usePrefs'
import {
  type LatLng,
  type ParseResponse,
  type Resource,
  type RouteRequest,
  type RouteResponse,
} from './types'

type ApiState = 'checking' | 'online' | 'offline'

/** Space the floating header takes at the top of the map. */
const HEADER_PX = 56

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
  const [snap, setSnap] = useState<Snap>('half')
  // Visible height of the sheet once it has stopped moving; the map pads by it.
  const [sheetPx, setSheetPx] = useState(0)
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

  const request = buildRequest(form)

  const handleMapClick = (point: LatLng) => {
    if (!picking) return
    setForm((f) => ({ ...f, [picking]: point }))
    // Keep the map in view while choosing points.
    setSnap('peek')
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
        setRoute(r)
        // Show the route and the comparison together.
        setSnap('half')
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

  const startPicking = (target: PickTarget | null) => {
    setPicking(target)
    // Get the sheet out of the way so the map can be tapped.
    if (target) setSnap('peek')
  }

  const peekSummary = (
    <div className="px-4 pb-3 pt-1">
      {tab === 'help' ? (
        <p className="min-h-11 py-2 text-sm text-neutral-ink">
          Pull up the panel to find water or a cool place nearby.
        </p>
      ) : route ? (
        <p className="min-h-11 rounded-lg bg-ice px-3 py-2 text-sm font-bold text-deep">
          {summaryText(route)}
        </p>
      ) : request ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => findRoute(request)}
          className="min-h-11 w-full rounded-lg bg-gradient-to-r from-deep to-teal-strong text-base font-bold text-white shadow-card disabled:bg-neutral-ink disabled:bg-none"
        >
          {loading ? 'Finding route…' : 'Find cool route'}
        </button>
      ) : (
        <p className="min-h-11 py-2 text-sm text-neutral-ink">
          {picking
            ? `Tap the map to set the ${picking}.`
            : 'Set a start and an end to find a route.'}
        </p>
      )}
    </div>
  )

  const tabs = (
    <nav
      className="flex gap-1 rounded-lg bg-ice p-1"
      aria-label="Screens"
    >
      {(['route', 'help'] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tab === t}
          onClick={() => setTab(t)}
          className={`min-h-11 flex-1 rounded-md text-sm font-bold transition-colors ${
            tab === t ? 'bg-deep text-white shadow-card' : 'text-deep hover:bg-white'
          }`}
        >
          {t === 'route' ? 'Plan a route' : 'Help now'}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="relative h-full overflow-hidden bg-mist">
      <div className="absolute inset-0">
        <RouteMap
          start={form.start}
          end={form.end}
          picking={picking}
          onMapClick={handleMapClick}
          route={tab === 'route' ? route : null}
          resources={tab === 'help' ? resources : []}
          topPad={HEADER_PX}
          bottomPad={sheetPx}
        />
      </div>

      <header
        className="absolute inset-x-2 z-[1200] flex h-11 items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-deep to-teal-strong px-3 text-white shadow-pop"
        style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" className="fill-ice" />
            <circle cx="21" cy="11" r="5" className="fill-amber" />
            <path d="M4 26c4-9 10-13 24-12v12z" className="fill-deep" opacity="0.85" />
          </svg>
          <h1 className="text-lg font-extrabold">Cool Route</h1>
        </div>
        <div className="flex items-center gap-2">
          <SampleBadge />
          <span className="text-xs text-ice">API: {apiState}</span>
        </div>
      </header>

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        onSettled={setSheetPx}
        tabs={tabs}
        peek={peekSummary}
      >
        {tab === 'help' ? (
          <HelpNow
            resources={resources}
            onResources={(_origin, list) => {
              setResources(list)
              if (list.length) setSnap('half')
            }}
            onWalk={walkTo}
          />
        ) : (
          <div className="pt-1">
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
              onPick={startPicking}
              onSubmit={findRoute}
              loading={loading}
            />
            {error && (
              <p role="alert" className="mt-3 font-medium text-error-ink">
                {error}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

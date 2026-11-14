import { useEffect, useRef, useState } from 'react'
import { api, USE_MOCKS } from './api'
import AskBox from './components/AskBox'
import FloatingSearch from './components/FloatingSearch'
import { useRecents, type Recent } from './hooks/useRecents'
import { useSearch } from './hooks/useSearch'
import { searchPlaces, type PlaceResult } from './search'
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

/** Space the floating header and search bar take at the top of the map. */
const TOP_PAD = 124

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
    // A point that changed by hand no longer has the searched place's name.
    if (next.start !== form.start) setLabels((l) => ({ ...l, start: undefined }))
    if (next.end !== form.end) {
      setLabels((l) => ({ ...l, end: undefined }))
      if (!fromSearch.current) search.setQuery('')
    }
  }
  const [picking, setPicking] = useState<PickTarget | null>(null)
  const [snap, setSnap] = useState<Snap>('half')
  // Visible height of the sheet once it has stopped moving; the map pads by it.
  const [sheetPx, setSheetPx] = useState(0)
  const [tab, setTab] = useState<'route' | 'help'>('route')
  const [resources, setResources] = useState<Resource[]>([])
  const search = useSearch(resources)
  const [recents, addRecent] = useRecents()
  const [searching, setSearching] = useState(false)
  const [focus, setFocus] = useState<{ point: LatLng; id: number } | null>(null)
  // Friendly names for points chosen by search or location, instead of coordinates.
  const [labels, setLabels] = useState<Partial<Record<PickTarget, string>>>({})
  const searchInput = useRef<HTMLInputElement>(null)
  // True while a place change comes from search, so the search text is kept.
  const fromSearch = useRef(false)
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
        <p className="min-h-11 py-2 text-sm text-muted">
          Pull up the panel to find water or a cool place nearby.
        </p>
      ) : route ? (
        <p className="min-h-11 rounded-lg bg-powder px-3 py-2 text-sm font-bold text-ink">
          {summaryText(route)}
        </p>
      ) : request ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => findRoute(request)}
          className="min-h-11 w-full rounded-lg bg-periwinkle border border-cool text-base font-bold text-ink shadow-card disabled:border-sky disabled:bg-sky disabled:text-muted"
        >
          {loading ? 'Finding route…' : 'Find cool route'}
        </button>
      ) : picking ? (
        <p className="min-h-11 py-2 text-sm font-semibold text-ink">
          Tap the map to set the {picking}.
        </p>
      ) : null}
    </div>
  )

  const pickPlace = (p: PlaceResult | Recent) => {
    const end = { lat: p.lat, lng: p.lng }
    fromSearch.current = true
    setForm((f) => ({ ...f, end }))
    fromSearch.current = false
    setLabels((l) => ({ ...l, end: p.name }))
    search.setQuery(p.name)
    setSearching(false)
    searchInput.current?.blur()
    setPicking(null)
    setTab('route')
    setSnap('half')
    setFocus((f) => ({ point: end, id: (f?.id ?? 0) + 1 }))
    addRecent({
      id: p.id,
      name: p.name,
      kind: p.kind,
      lat: p.lat,
      lng: p.lng,
      outsideRoutes: p.outsideRoutes,
    })
    // Start from "my location" when the device already allows it; otherwise keep
    // whatever start is set.
    if (!form.start) fillStartFromLocation()
  }

  /** Never prompts: only uses the location when permission was already granted. */
  const fillStartFromLocation = async () => {
    try {
      const perm = await navigator.permissions?.query({ name: 'geolocation' })
      if (perm?.state !== 'granted') return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const start = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setTrip((t) => (t.start ? t : { ...t, start }))
          setLabels((l) => (l.start ? l : { ...l, start: 'My location' }))
        },
        () => {},
        { timeout: 5000 },
      )
    } catch {
      /* no location: the person sets the start themselves */
    }
  }

  /** For the plain-English box: use the first match for a spoken destination. */
  const pickByText = async (text: string) => {
    const [first] = await searchPlaces(text, { resources })
    if (!first) return null
    pickPlace(first)
    return first.name
  }

  const tabs = (
    <nav
      className="flex gap-1 rounded-lg bg-sky p-1"
      aria-label="Screens"
    >
      {(['route', 'help'] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={tab === t}
          onClick={() => {
            setTab(t)
            setSearching(false)
          }}
          className={`min-h-11 flex-1 rounded-md text-sm font-bold transition-colors ${
            tab === t ? 'bg-periwinkle text-ink shadow-card' : 'text-ink hover:bg-powder'
          }`}
        >
          {t === 'route' ? 'Plan a route' : 'Help now'}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="relative h-dvh overflow-hidden bg-mist">
      <div className="absolute inset-0">
        <RouteMap
          start={form.start}
          end={form.end}
          picking={picking}
          onMapClick={handleMapClick}
          route={tab === 'route' ? route : null}
          resources={tab === 'help' ? resources : []}
          topPad={TOP_PAD}
          bottomPad={sheetPx}
          focus={focus}
        />
      </div>

      <header
        className="absolute inset-x-2 z-[1200] flex h-11 items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-header-from to-header-to px-3 text-ink shadow-pop"
        style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" className="fill-powder" />
            <circle cx="21" cy="11" r="5" className="fill-sun-strong" />
            <path d="M4 26c4-9 10-13 24-12v12z" className="fill-cool" opacity="0.85" />
          </svg>
          <h1 className="text-lg font-extrabold">Cool Route</h1>
        </div>
        <div className="flex items-center gap-2">
          <SampleBadge />
          <span className="text-xs text-ink">API: {apiState}</span>
        </div>
      </header>

      <FloatingSearch
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        recents={recents}
        activeIndex={search.active}
        onActiveChange={search.setActive}
        open={searching}
        onOpen={() => setSearching(true)}
        onClose={() => setSearching(false)}
        onChoose={pickPlace}
        onChooseOnMap={() => {
          setSearching(false)
          searchInput.current?.blur()
          startPicking('end')
        }}
        inputRef={searchInput}
      />

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        onSettled={setSheetPx}
        scrollKey={tab}
        reservedTop={TOP_PAD}
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
            <AskBox onParsed={applyParsed} onDestination={pickByText} />
            <RouteForm
              value={form}
              onChange={setForm}
              picking={picking}
              onPick={startPicking}
              onSubmit={findRoute}
              loading={loading}
              labels={labels}
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

import { tap } from './haptics'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api, USE_MOCKS } from './api'
import AskBox from './components/AskBox'
import FloatingSearch from './components/FloatingSearch'
import LayersControl from './components/LayersControl'
import LocateButton from './components/LocateButton'
import { useMapPrefs } from './hooks/useMapPrefs'
import { useRecents, type Recent } from './hooks/useRecents'
import { useSearch } from './hooks/useSearch'
import { BASE_LAYERS } from './mapLayers'
import { searchPlaces, type PlaceResult } from './search'
import HelpNow from './components/HelpNow'
import RouteForm from './components/RouteForm'
import { DEFAULT_TIME, buildRequest, type FormValue, type PickTarget } from './form'
import BottomSheet, { type Snap } from './components/BottomSheet'
import ComparisonCard from './components/ComparisonCard'
import DemoTripCard from './components/DemoTripCard'
import DirectionsPanel from './components/DirectionsPanel'
import NearbyPopup from './components/NearbyPopup'
import WalkPanel from './components/WalkPanel'
import { walkHeadline } from './walkLogic'
import { useWalk } from './hooks/useWalk'
import { RouteSkeleton } from './components/Skeleton'
import Toast from './components/Toast'
import IntroSplash from './components/IntroSplash'
import AccountMenu from './components/auth/AccountMenu'
import AuthFlow from './components/auth/AuthFlow'
import { clearProfile, getProfile, subscribeProfile, type Profile } from './auth/profile'
import RouteMap from './components/RouteMap'
import SampleBadge from './components/SampleBadge'
import { summaryText } from './routeSummary'
import { usePrefs } from './hooks/usePrefs'
import {
  type DirectionsResponse,
  type LatLng,
  type ParseResponse,
  type Resource,
  type RouteRequest,
  type RouteResponse,
} from './types'

type ApiState = 'checking' | 'online' | 'offline'

const OUTSIDE_MESSAGE =
  'Outside the walking-route area. Choose a place on campus or Mill Ave.'

/** The demo trip: Memorial Union to Tempe Beach Park at 3 PM. */
const DEMO_TRIP = {
  start: { lat: 33.4166, lng: -111.934 },
  end: { lat: 33.43, lng: -111.944 },
  time: '15:00',
}

/** The pop-up needs this much map above the sheet (header and search take the top). */
const MIN_MAP_FOR_POPUP = 260

/** Space the floating header and search bar take at the top of the map. */
const TOP_PAD = 124

type Stage = 'intro' | 'auth' | 'app'

export default function App() {
  // The brand video plays first, then sign-in (once per device). The app loads
  // underneath meanwhile. "?nointro" skips both, for testing.
  const [stage, setStage] = useState<Stage>(() =>
    new URLSearchParams(window.location.search).has('nointro') ? 'app' : 'intro',
  )
  const [apiState, setApiState] = useState<ApiState>(
    USE_MOCKS ? 'offline' : 'checking',
  )
  const [prefs, setPrefs] = usePrefs()
  const profile = useSyncExternalStore(subscribeProfile, getProfile)
  const completeAuth = (p: Profile) => {
    // Someone here to stay safe in the heat starts on High heat sensitivity.
    if (p.purpose === 'heat-safety') setPrefs({ ...prefs, heat_sensitivity: 'high' })
    setStage('app')
  }
  const [trip, setTrip] = useState<Omit<FormValue, 'prefs'>>({
    start: null,
    end: null,
    departTime: DEFAULT_TIME,
  })
  const form: FormValue = { ...trip, prefs }
  // Trip details reset on reload; preferences are saved on this device.
  // The newest form value, including updates made earlier in the same event, so
  // two setForm calls in a row (e.g. parse, then pick a destination) compose.
  const latest = useRef(form)
  useEffect(() => {
    latest.current = form
  })
  const setForm = (update: FormValue | ((f: FormValue) => FormValue)) => {
    const prev = latest.current
    const next = typeof update === 'function' ? update(prev) : update
    latest.current = next
    setTrip({ start: next.start, end: next.end, departTime: next.departTime })
    setPrefs(next.prefs)
    // A point that changed by hand no longer has the searched place's name.
    if (next.start !== prev.start) setLabels((l) => ({ ...l, start: undefined }))
    if (next.end !== prev.end) {
      setLabels((l) => ({ ...l, end: undefined }))
      if (!fromSearch.current) {
        search.setQuery('')
        setEndOutside(false)
      }
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
  const [mapPrefs, setMapPrefs] = useMapPrefs()
  const [myLocation, setMyLocation] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [mapNotice, setMapNotice] = useState<string | null>(null)
  const satellite = mapPrefs.type === 'satellite'
  const [searching, setSearching] = useState(false)
  const [focus, setFocus] = useState<{ point: LatLng; id: number } | null>(null)
  // Friendly names for points chosen by search or location, instead of coordinates.
  const [labels, setLabels] = useState<Partial<Record<PickTarget, string>>>({})
  const searchInput = useRef<HTMLInputElement>(null)
  // True while a place change comes from search, so the search text is kept.
  const fromSearch = useRef(false)
  // The chosen destination is beyond the walking-route area: never ask /route.
  const [endOutside, setEndOutside] = useState(false)
  const [route, setRoute] = useState<RouteResponse | null>(null)
  // The request that produced `route`, so directions match the line on the map.
  const [routed, setRouted] = useState<RouteRequest | null>(null)
  // Which route the directions panel shows and "Start walking" follows.
  const [dirKind, setDirKind] = useState<'fastest' | 'coolest'>('coolest')
  // Directions of the walk in progress, or null when not walking.
  const [walkDirections, setWalkDirections] = useState<DirectionsResponse | null>(null)
  // Changes with every walk, so the nearby pop-up forgets places it already showed.
  const [walkId, setWalkId] = useState(0)
  const walk = useWalk()
  const arrived = walk.tracking?.arrived ?? false
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

  // A map notice goes away by itself after a few seconds.
  useEffect(() => {
    if (!mapNotice) return
    const id = window.setTimeout(() => setMapNotice(null), 7000)
    return () => window.clearTimeout(id)
  }, [mapNotice])

  /** Tiles could not load: fall back for now, without overwriting the saved choice. */
  const onTileFailure = (layer: 'base' | 'labels') => {
    if (layer === 'base') {
      if (mapPrefs.type === 'standard') return
      setMapPrefs({ ...mapPrefs, type: 'standard' }, { save: false })
      setMapNotice(
        `We could not load the ${BASE_LAYERS[mapPrefs.type].label} map, so we switched to Standard.`,
      )
    } else {
      setMapPrefs({ ...mapPrefs, labels: false }, { save: false })
      setMapNotice('Map labels could not load, so they are hidden.')
    }
  }

  const handleMapClick = (point: LatLng) => {
    if (!picking) return
    tap()
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

  // What Retry should run again after a failed request.
  const lastRequest = useRef<RouteRequest | null>(null)

  const stopWalk = () => {
    walk.stop()
    setWalkDirections(null)
  }

  const startWalk = (d: DirectionsResponse) => {
    if (!route) return
    setWalkDirections(d)
    setWalkId((n) => n + 1)
    walk.start(route[d.kind].geometry)
    // Get the panel out of the way so the map shows where you are.
    setSnap('peek')
  }

  /** Off the route: plan a new one from where you are now to the same destination. */
  const rerouteFromHere = () => {
    const here = walk.position
    if (!here || !form.end) return
    const next = { ...form, start: here }
    setForm(next)
    setLabels((l) => ({ ...l, start: 'My location' }))
    const req = buildRequest(next)
    if (req) findRoute(req)
  }

  const findRoute = (req: RouteRequest, force = false) => {
    if (endOutside && !force) return
    stopWalk()
    lastRequest.current = req
    setLoading(true)
    setError(null)
    setExplanation(null)
    api
      .route(req)
      .then((r) => {
        // Bring the first result into view above the form.
        setRoute(r)
        setRouted(req)
        // Show the route and the comparison together.
        setSnap('half')
        // The explanation is optional: if it fails, the app works without it.
        // Never ask for one on sample data.
        if (!USE_MOCKS) {
          api
            .explain(r, req.prefs)
            .then((x) => setExplanation(x.text.trim() || null))
            .catch(() => {})
        }
      })
      .catch(() => {
        setRoute(null)
        setError('We could not get a route right now. Please try again.')
      })
      .finally(() => setLoading(false))
  }

  const runDemoTrip = () => {
    const next: FormValue = {
      ...form,
      start: DEMO_TRIP.start,
      end: DEMO_TRIP.end,
      departTime: DEMO_TRIP.time,
    }
    // Keep the search text we set below (a changed end normally clears it).
    fromSearch.current = true
    setForm(next)
    fromSearch.current = false
    setLabels({ start: 'Memorial Union', end: 'Tempe Beach Park' })
    search.setQuery('Tempe Beach Park')
    setEndOutside(false)
    setPicking(null)
    setTab('route')
    const req = buildRequest(next)
    if (req) findRoute(req, true)
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
      ) : endOutside ? (
        <p role="status" className="min-h-11 rounded-lg bg-lavender px-3 py-2 text-sm font-bold text-ink">
          {OUTSIDE_MESSAGE}
        </p>
      ) : walkDirections ? (
        <p aria-live="polite" className="min-h-11 rounded-lg bg-powder px-3 py-2 text-sm font-bold text-ink">
          {walkHeadline(walkDirections, walk, arrived)}
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
          className="btn-sheen min-h-11 w-full rounded-lg bg-periwinkle border border-cool text-base font-bold text-ink shadow-card disabled:border-sky disabled:bg-sky disabled:text-ink"
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
    tap()
    fromSearch.current = true
    setForm((f) => ({ ...f, end }))
    fromSearch.current = false
    setLabels((l) => ({ ...l, end: p.name }))
    setEndOutside(!!p.outsideRoutes)
    if (p.outsideRoutes) setRoute(null)
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

  const recenter = () => {
    if (!navigator.geolocation) {
      setMapNotice('This device cannot share its location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const inTempe =
          Math.abs(point.lat - 33.4194) < 0.08 && Math.abs(point.lng + 111.9341) < 0.1
        if (inTempe) {
          setMyLocation(point)
          setFocus((f) => ({ point, id: (f?.id ?? 0) + 1 }))
        } else {
          setMapNotice('You are outside the Tempe campus area, so showing the campus.')
          setFocus((f) => ({ point: { lat: 33.4194, lng: -111.9341 }, id: (f?.id ?? 0) + 1 }))
        }
      },
      () => {
        setLocating(false)
        setMapNotice('Could not get your location. Allow location access and try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="relative h-dvh overflow-clip bg-mist">
      <div className="absolute inset-0">
        <RouteMap
          start={form.start}
          end={form.end}
          picking={picking}
          onMapClick={handleMapClick}
          route={tab === 'route' ? route : null}
          resources={tab === 'help' && mapPrefs.spots ? resources : []}
          topPad={TOP_PAD}
          bottomPad={sheetPx}
          focus={focus}
          position={walkDirections ? walk.position : myLocation}
          nearby={walkDirections ? walk.tracking?.nearby : undefined}
          only={walkDirections ? walkDirections.kind : null}
          follow={walk.walking}
          mapPrefs={mapPrefs}
          onTileFailure={onTileFailure}
        />
      </div>

      <header
        className="absolute inset-x-2 z-[1310] flex h-11 items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-header-from to-header-to px-3 text-ink shadow-pop"
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
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-ink"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiState === 'online'
                  ? 'bg-open'
                  : apiState === 'offline'
                    ? 'bg-closed'
                    : 'bg-neutral'
              }`}
              aria-hidden="true"
            />
            {apiState === 'online'
              ? 'Live'
              : apiState === 'offline'
                ? 'Offline'
                : 'Connecting'}
          </span>
          <AccountMenu
            profile={profile}
            onSignIn={() => setStage('auth')}
            onSignOut={() => {
              clearProfile()
              setStage('auth')
            }}
          />
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
        strong={satellite}
      />

      <LocateButton onLocate={recenter} busy={locating} strong={satellite} />
      <LayersControl prefs={mapPrefs} onChange={setMapPrefs} strong={satellite} />

      <BottomSheet
        snap={snap}
        onSnapChange={setSnap}
        onSettled={setSheetPx}
        scrollKey={walkDirections ? `${tab}-walk` : tab}
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
          walkDirections ? (
            <WalkPanel
              directions={walkDirections}
              walk={walk}
              arrived={arrived}
              onStop={stopWalk}
              onReroute={rerouteFromHere}
            />
          ) : (
          <div className="pt-1">
            {!route && !loading && <DemoTripCard onRun={runDemoTrip} loading={loading} />}
            {loading && !route && <RouteSkeleton />}
            {route && (
              <ComparisonCard
                route={route}
                shadeWeight={form.prefs.shade_weight}
                loading={loading}
                explanation={explanation}
                onShadeChange={(w) =>
                  setForm((f) => ({ ...f, prefs: { ...f.prefs, shade_weight: w } }))
                }
                onShadeCommit={() => request && !endOutside && findRoute(request)}
              />
            )}
            {route && routed && (
              <DirectionsPanel
                route={route}
                request={routed}
                kind={dirKind}
                onKindChange={setDirKind}
                onStart={startWalk}
                onFocus={(point) => setFocus((f) => ({ point, id: (f?.id ?? 0) + 1 }))}
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
              notice={endOutside ? OUTSIDE_MESSAGE : undefined}
              // Only re-request when a route is already showing, as the shade slider does.
              onTimeCommit={(time) => {
                if (route && request && !endOutside) {
                  findRoute({ ...request, depart_time: time })
                }
              }}
            />
          </div>
          )
        )}
      </BottomSheet>

      {walk.walking && walk.tracking && (
        <NearbyPopup
          key={walkId}
          nearby={walk.tracking.nearby}
          bottom={sheetPx}
          // With the sheet pulled up there is no map left to float over.
          hidden={window.innerHeight - sheetPx < MIN_MAP_FOR_POPUP}
          onShow={(point) => setFocus((f) => ({ point, id: (f?.id ?? 0) + 1 }))}
        />
      )}

      {mapNotice && (
        <Toast
          message={mapNotice}
          bottom={sheetPx + (error ? 84 : 0)}
          onDismiss={() => setMapNotice(null)}
        />
      )}

      {error && (
        <Toast
          message={error}
          actionLabel="Retry"
          bottom={sheetPx}
          onAction={() => {
            const req = lastRequest.current
            setError(null)
            if (req) findRoute(req)
          }}
          onDismiss={() => setError(null)}
        />
      )}

      {stage === 'auth' && <AuthFlow onComplete={completeAuth} />}
      {stage === 'intro' && (
        <IntroSplash
          firstTime={!profile}
          onStart={() => setStage('auth')}
          onDone={() => setStage(getProfile() ? 'app' : 'auth')}
        />
      )}
    </div>
  )
}

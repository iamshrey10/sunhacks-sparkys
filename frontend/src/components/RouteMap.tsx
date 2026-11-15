import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Tooltip,
  TileLayer,
  useMap,
  useMapEvents,
  type TileLayerProps,
} from 'react-leaflet'
import { COOLEST_TOKEN, FASTEST_TOKEN, token } from '../colors'
import { PLACES } from '../data/places'
import {
  BASE_LAYERS,
  SATELLITE_LABELS,
  type MapPrefs,
  type TileSpec,
} from '../mapLayers'
import type { LatLng, NearbyPlace, Resource, RouteResponse } from '../types'

// ASU Tempe campus.
const TEMPE_CENTER: [number, number] = [33.4194, -111.9341]

interface Props {
  start: LatLng | null
  end: LatLng | null
  /** Which point the next map tap will set, or null when taps are ignored. */
  picking: 'start' | 'end' | null
  onMapClick: (point: LatLng) => void
  route?: RouteResponse | null
  resources?: Resource[]
  /** Pixels at the top (header) and bottom (sheet) that cover the map. */
  topPad: number
  bottomPad: number
  /** Pan here (in the part of the map not covered by the sheet) when it changes. */
  focus?: { point: LatLng; id: number } | null
  /** Where you are while walking (live GPS). */
  position?: LatLng | null
  /** Restaurants, cafes and sights around you while walking. */
  nearby?: NearbyPlace[]
  /** Draw only this route, e.g. the one being walked. */
  only?: 'fastest' | 'coolest' | null
  /** Keep the map on your position as it changes. */
  follow?: boolean
  /** Which tiles to draw and which details to show. */
  mapPrefs: MapPrefs
  /** Called when the chosen tiles (or the labels overlay) cannot be loaded. */
  onTileFailure: (layer: 'base' | 'labels') => void
}

/**
 * Zoom to show both routes inside the part of the map that is not covered by
 * the header or the sheet. Runs when a result arrives and when the sheet settles.
 */
function FitRoute({
  route,
  bothRoutes,
  topPad,
  bottomPad,
}: {
  route: RouteResponse
  bothRoutes: boolean
  topPad: number
  bottomPad: number
}) {
  const map = useMap()
  useEffect(() => {
    const points = bothRoutes
      ? [...route.fastest.geometry, ...route.coolest.geometry]
      : route.coolest.geometry
    if (!points.length) return
    // Never reserve more than most of the map, or the route would shrink to a dot.
    const cap = map.getSize().y * 0.6
    map.fitBounds(points, {
      paddingTopLeft: [24, Math.min(topPad, cap / 2) + 16],
      paddingBottomRight: [24, Math.min(bottomPad, cap) + 16],
    })
  }, [map, route, bothRoutes, topPad, bottomPad])
  return null
}

/**
 * Centre a chosen point in the visible part of the map. Re-applies while the
 * sheet is still settling after the choice, then leaves the map alone.
 */
function FocusPoint({
  focus,
  topPad,
  bottomPad,
}: {
  focus: { point: LatLng; id: number }
  topPad: number
  bottomPad: number
}) {
  const map = useMap()
  const since = useRef(0)
  useEffect(() => {
    since.current = Date.now()
  }, [focus.id])
  useEffect(() => {
    if (Date.now() - since.current > 1500) return
    const cap = map.getSize().y * 0.6
    const shift = (Math.min(topPad, cap / 2) - Math.min(bottomPad, cap)) / 2
    const zoom = Math.max(map.getZoom(), 16)
    const target = map
      .project([focus.point.lat, focus.point.lng], zoom)
      .subtract([0, shift])
    map.setView(map.unproject(target, zoom), zoom)
  }, [map, focus, topPad, bottomPad])
  return null
}

/**
 * Keep your position in the visible part of the map while walking. The first fix
 * zooms in; after that the zoom is left alone so you can still pinch it.
 */
function FollowPosition({
  position,
  topPad,
  bottomPad,
}: {
  position: LatLng
  topPad: number
  bottomPad: number
}) {
  const map = useMap()
  const zoomed = useRef(false)
  useEffect(() => {
    const cap = map.getSize().y * 0.6
    const shift = (Math.min(topPad, cap / 2) - Math.min(bottomPad, cap)) / 2
    const zoom = zoomed.current ? map.getZoom() : Math.max(map.getZoom(), 17)
    zoomed.current = true
    const target = map.project([position.lat, position.lng], zoom).subtract([0, shift])
    map.setView(map.unproject(target, zoom), zoom, { animate: true })
  }, [map, position, topPad, bottomPad])
  return null
}

/** Re-measure the map once the sheet stops moving (never per frame). */
function SizeSync({ settledKey }: { settledKey: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, settledKey])
  return null
}

/**
 * A tile layer that reports when it clearly cannot load: three failures before
 * a single tile has arrived. One flaky tile does not count. Remount it (via
 * `key`) to reset the count.
 */
function GuardedTiles({
  spec,
  onFail,
  zIndex,
}: {
  spec: TileSpec
  onFail: () => void
  zIndex?: TileLayerProps['zIndex']
}) {
  const stats = useRef({ ok: 0, errors: 0, failed: false })
  return (
    <TileLayer
      url={spec.url}
      attribution={spec.attribution}
      maxZoom={spec.maxZoom}
      className={spec.className}
      zIndex={zIndex}
      eventHandlers={{
        tileload: () => {
          stats.current.ok += 1
        },
        tileerror: () => {
          const s = stats.current
          s.errors += 1
          if (!s.failed && s.ok === 0 && s.errors >= 3) {
            s.failed = true
            onFail()
          }
        },
      }}
    />
  )
}

/**
 * Names of the known places, drawn as outlined text over the satellite imagery
 * (the street-name layers are sparse around campus). Not clickable.
 */
function PlaceLabels() {
  const icons = useMemo(
    () =>
      PLACES.map((p) => ({
        place: p,
        icon: L.divIcon({
          className: 'place-label',
          html: `<span>${p.name.replace(/[<>&"]/g, '')}</span>`,
          iconSize: [0, 0],
        }),
      })),
    [],
  )
  return (
    <>
      {icons.map(({ place, icon }) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={icon}
          interactive={false}
          keyboard={false}
        />
      ))}
    </>
  )
}

function ClickHandler({ onMapClick }: Pick<Props, 'onMapClick'>) {
  useMapEvents({
    click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

const marker = (fillColor: string) => ({
  color: token('white'),
  weight: 3,
  fillColor,
  fillOpacity: 1,
})

/**
 * Draws a solid route line in over about 0.6 s when it is added to the map.
 * Skipped when the person prefers reduced motion. Not used for dashed lines,
 * which would lose their dashes.
 */
function drawIn(e: L.LeafletEvent) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const el = (e.target as L.Polyline).getElement() as SVGPathElement | undefined
  if (!el?.getTotalLength) return
  const length = el.getTotalLength()
  el.style.strokeDasharray = `${length}`
  el.style.strokeDashoffset = `${length}`
  void el.getBoundingClientRect() // start from the hidden state
  el.style.transition = 'stroke-dashoffset 600ms ease-out'
  el.style.strokeDashoffset = '0'
  el.addEventListener(
    'transitionend',
    () => {
      el.style.strokeDasharray = ''
      el.style.transition = ''
    },
    { once: true },
  )
}

export default function RouteMap({
  start,
  end,
  picking,
  onMapClick,
  route,
  resources = [],
  topPad,
  bottomPad,
  focus,
  position,
  nearby = [],
  only = null,
  follow = false,
  mapPrefs,
  onTileFailure,
}: Props) {
  const satellite = mapPrefs.type === 'satellite'
  const base = BASE_LAYERS[mapPrefs.type]
  const drawKey = route
    ? `${route.coolest.geometry.length}-${Math.round(route.coolest.distance_m)}`
    : ''
  return (
    <div
      className={`h-full w-full ${picking ? 'cursor-crosshair' : ''}`}
      aria-label="Map of Tempe"
      // Keeps the OpenStreetMap attribution above the sheet (see index.css).
      style={{ '--sheet-h': `${bottomPad}px` } as React.CSSProperties}
    >
      <MapContainer
        center={TEMPE_CENTER}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
      >
        {/* Only the active tile layer is mounted, so the attribution follows it. */}
        <GuardedTiles
          key={mapPrefs.type}
          spec={base}
          onFail={() => onTileFailure('base')}
        />
        {satellite &&
          mapPrefs.labels &&
          SATELLITE_LABELS.map((spec) => (
            <GuardedTiles
              key={spec.url}
              spec={spec}
              zIndex={5}
              onFail={() => onTileFailure('labels')}
            />
          ))}
        {satellite && mapPrefs.labels && <PlaceLabels />}
        <SizeSync settledKey={bottomPad} />
        {focus && <FocusPoint focus={focus} topPad={topPad} bottomPad={bottomPad} />}
        <ClickHandler onMapClick={picking ? onMapClick : () => {}} />
        {route && (
          <>
            {!follow && (
              <FitRoute
                route={route}
                bothRoutes={mapPrefs.bothRoutes}
                topPad={topPad}
                bottomPad={bottomPad}
              />
            )}
            {mapPrefs.bothRoutes && only !== 'coolest' && (
              <>
                <Polyline
                  positions={route.fastest.geometry}
                  pathOptions={{
                    color: token('white'),
                    weight: 8,
                    opacity: satellite ? 1 : 0.9,
                  }}
                />
                <Polyline
                  positions={route.fastest.geometry}
                  pathOptions={{
                    color: token(FASTEST_TOKEN),
                    weight: 4,
                    opacity: 1,
                    dashArray: '8 8',
                  }}
                />
              </>
            )}
            {only !== 'fastest' && (
              <>
                {/* A soft aqua halo under the route: a second, wider line (no CSS filter). */}
                <Polyline
                  key={`halo-${drawKey}`}
                  positions={route.coolest.geometry}
                  pathOptions={{
                    color: token('glow-aqua'),
                    weight: 22,
                    opacity: satellite ? 0.4 : 0.28,
                    lineCap: 'round',
                    lineJoin: 'round',
                    interactive: false,
                    className: 'route-halo',
                  }}
                />
                {/* A new key for each new route, so each one draws in. */}
                <Polyline
                  key={`case-${drawKey}`}
                  positions={route.coolest.geometry}
                  pathOptions={{
                    color: token('white'),
                    weight: 11,
                    opacity: satellite ? 1 : 0.95,
                  }}
                  eventHandlers={{ add: drawIn }}
                />
                <Polyline
                  key={`line-${drawKey}`}
                  positions={route.coolest.geometry}
                  pathOptions={{ color: token(COOLEST_TOKEN), weight: 6, opacity: 1 }}
                  eventHandlers={{ add: drawIn }}
                />
                {/*
                  Slow flowing light on the main line: thin white dots that drift
                  along it once it has drawn in. The solid line underneath stays
                  fully readable; hidden entirely for reduced motion (index.css).
                */}
                <Polyline
                  key={`flow-${drawKey}`}
                  positions={route.coolest.geometry}
                  pathOptions={{
                    color: token('white'),
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '1 22',
                    lineCap: 'round',
                    interactive: false,
                    className: 'route-flow',
                  }}
                />
              </>
            )}
          </>
        )}
        {resources.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.location.lat, r.location.lng]}
            radius={10}
            pathOptions={marker(
              r.open_now === true
                ? token('cool')
                : r.open_now === false
                  ? token('neutral')
                  : token('sun-strong'),
            )}
          >
            <Tooltip>{r.name}</Tooltip>
          </CircleMarker>
        ))}
        {nearby.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.location.lat, p.location.lng]}
            radius={7}
            pathOptions={marker(token('lavender'))}
          >
            <Tooltip>{p.name}</Tooltip>
          </CircleMarker>
        ))}
        {/* Soft pulse rings under the start and end pins (transform and opacity only). */}
        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={9}
            pathOptions={{
              stroke: false,
              fillColor: token('glow-aqua'),
              fillOpacity: 0.5,
              interactive: false,
              className: 'pin-pulse',
            }}
          />
        )}
        {end && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={9}
            pathOptions={{
              stroke: false,
              fillColor: token('glow-violet'),
              fillOpacity: 0.55,
              interactive: false,
              className: 'pin-pulse pin-pulse-late',
            }}
          />
        )}
        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={9}
            pathOptions={marker(token('cool'))}
          />
        )}
        {end && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={9}
            pathOptions={marker(token('ink'))}
          />
        )}
        {position && (
          <>
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={18}
              pathOptions={{
                stroke: false,
                fillColor: token('focus'),
                fillOpacity: 0.2,
                interactive: false,
                className: 'pin-breathe',
              }}
            />
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={8}
              pathOptions={marker(token('focus'))}
            >
              <Tooltip>You are here</Tooltip>
            </CircleMarker>
            {follow && <FollowPosition position={position} topPad={topPad} bottomPad={bottomPad} />}
          </>
        )}
      </MapContainer>
    </div>
  )
}

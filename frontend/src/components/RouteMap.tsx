import { useEffect, useRef } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Tooltip,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { COOLEST_TOKEN, FASTEST_TOKEN, token } from '../colors'
import type { LatLng, Resource, RouteResponse } from '../types'

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
}

/**
 * Zoom to show both routes inside the part of the map that is not covered by
 * the header or the sheet. Runs when a result arrives and when the sheet settles.
 */
function FitRoute({
  route,
  topPad,
  bottomPad,
}: {
  route: RouteResponse
  topPad: number
  bottomPad: number
}) {
  const map = useMap()
  useEffect(() => {
    const points = [...route.fastest.geometry, ...route.coolest.geometry]
    if (!points.length) return
    // Never reserve more than most of the map, or the route would shrink to a dot.
    const cap = map.getSize().y * 0.6
    map.fitBounds(points, {
      paddingTopLeft: [24, Math.min(topPad, cap / 2) + 16],
      paddingBottomRight: [24, Math.min(bottomPad, cap) + 16],
    })
  }, [map, route, topPad, bottomPad])
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

/** Re-measure the map once the sheet stops moving (never per frame). */
function SizeSync({ settledKey }: { settledKey: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, settledKey])
  return null
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
}: Props) {
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
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SizeSync settledKey={bottomPad} />
        {focus && <FocusPoint focus={focus} topPad={topPad} bottomPad={bottomPad} />}
        <ClickHandler onMapClick={picking ? onMapClick : () => {}} />
        {route && (
          <>
            <FitRoute route={route} topPad={topPad} bottomPad={bottomPad} />
            <Polyline
              positions={route.fastest.geometry}
              pathOptions={{ color: token('white'), weight: 8, opacity: 0.9 }}
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
            <Polyline
              positions={route.coolest.geometry}
              pathOptions={{ color: token('white'), weight: 11, opacity: 0.95 }}
            />
            <Polyline
              positions={route.coolest.geometry}
              pathOptions={{ color: token(COOLEST_TOKEN), weight: 6, opacity: 1 }}
            />
          </>
        )}
        {resources.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.location.lat, r.location.lng]}
            radius={10}
            pathOptions={marker(
              r.open_now === true
                ? token('teal-strong')
                : r.open_now === false
                  ? token('neutral-ink')
                  : token('amber'),
            )}
          >
            <Tooltip>{r.name}</Tooltip>
          </CircleMarker>
        ))}
        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={9}
            pathOptions={marker(token('aqua'))}
          />
        )}
        {end && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={9}
            pathOptions={marker(token('deep'))}
          />
        )}
      </MapContainer>
    </div>
  )
}

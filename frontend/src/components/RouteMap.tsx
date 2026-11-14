import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { COOLEST_COLOR, FASTEST_COLOR } from '../colors'
import type { LatLng, RouteResponse } from '../types'

// ASU Tempe campus.
const TEMPE_CENTER: [number, number] = [33.4194, -111.9341]

interface Props {
  start: LatLng | null
  end: LatLng | null
  /** Which point the next map tap will set, or null when taps are ignored. */
  picking: 'start' | 'end' | null
  onMapClick: (point: LatLng) => void
  route?: RouteResponse | null
}

/** Zoom to show both routes whenever a new result arrives. */
function FitRoute({ route }: { route: RouteResponse }) {
  const map = useMap()
  useEffect(() => {
    const points = [...route.fastest.geometry, ...route.coolest.geometry]
    if (points.length) map.fitBounds(points, { padding: [30, 30] })
  }, [map, route])
  return null
}

function ClickHandler({ onMapClick }: Pick<Props, 'onMapClick'>) {
  useMapEvents({
    click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

const marker = (fillColor: string) => ({
  color: '#ffffff',
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
}: Props) {
  return (
    <div
      className={`h-full w-full ${picking ? 'cursor-crosshair' : ''}`}
      aria-label="Map of Tempe"
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
        <ClickHandler onMapClick={picking ? onMapClick : () => {}} />
        {route && (
          <>
            <FitRoute route={route} />
            <Polyline
              positions={route.fastest.geometry}
              pathOptions={{ color: FASTEST_COLOR, weight: 5, opacity: 0.9 }}
            />
            <Polyline
              positions={route.coolest.geometry}
              pathOptions={{ color: COOLEST_COLOR, weight: 7, opacity: 0.95 }}
            />
          </>
        )}
        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={9}
            pathOptions={marker('#15803d')}
          />
        )}
        {end && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={9}
            pathOptions={marker('#b91c1c')}
          />
        )}
      </MapContainer>
    </div>
  )
}

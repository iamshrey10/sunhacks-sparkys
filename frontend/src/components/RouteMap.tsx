import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'
import type { LatLng } from '../types'

// ASU Tempe campus.
const TEMPE_CENTER: [number, number] = [33.4194, -111.9341]

interface Props {
  start: LatLng | null
  end: LatLng | null
  /** Which point the next map tap will set, or null when taps are ignored. */
  picking: 'start' | 'end' | null
  onMapClick: (point: LatLng) => void
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

export default function RouteMap({ start, end, picking, onMapClick }: Props) {
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

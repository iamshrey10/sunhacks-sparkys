import { useEffect, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { api } from './api'

// ASU Tempe campus.
const TEMPE_CENTER: [number, number] = [33.4194, -111.9341]

type ApiState = 'checking' | 'online' | 'offline'

export default function App() {
  const [apiState, setApiState] = useState<ApiState>('checking')

  useEffect(() => {
    api
      .health()
      .then(() => setApiState('online'))
      .catch(() => setApiState('offline'))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">Cool Route</h1>
        <span
          className={
            apiState === 'online'
              ? 'text-sm text-emerald-400'
              : 'text-sm text-slate-400'
          }
        >
          API: {apiState}
        </span>
      </header>
      <main className="min-h-0 flex-1">
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
        </MapContainer>
      </main>
    </div>
  )
}

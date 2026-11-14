import { useState } from 'react'
import { api } from '../api'
import type { LatLng, Resource } from '../types'

// Used only when the device cannot share its location; we say so on screen.
const FALLBACK_ORIGIN: LatLng = { lat: 33.4194, lng: -111.9341 }

interface Props {
  /** Called with the results (or []) so the map can show them. */
  onResources: (origin: LatLng | null, resources: Resource[]) => void
  resources: Resource[]
  onWalk: (origin: LatLng, resource: Resource) => void
}

type Status = 'idle' | 'locating' | 'loading' | 'done' | 'error'

const KIND_LABEL: Record<Resource['kind'], string> = {
  water: 'Water',
  cooling_center: 'Cooling center',
  library: 'Library',
  transit: 'Transit',
  other: 'Other',
}

function openBadge(open: boolean | null) {
  if (open === true) return { text: 'Open now', cls: 'bg-mint text-ink' }
  if (open === false) return { text: 'Closed', cls: 'bg-sky text-ink' }
  return { text: 'Hours unknown', cls: 'bg-sun text-ink' }
}

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'))
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
    })
  })

export default function HelpNow({ onResources, resources, onWalk }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [origin, setOrigin] = useState<LatLng | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)

  const find = async () => {
    setStatus('locating')
    let here = FALLBACK_ORIGIN
    let fallback = false
    try {
      const pos = await getPosition()
      here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch {
      fallback = true
    }
    setOrigin(here)
    setUsedFallback(fallback)
    setStatus('loading')
    try {
      const res = await api.resources(here)
      const sorted = [...res.resources].sort(
        (a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity),
      )
      onResources(here, sorted)
      setStatus('done')
    } catch {
      onResources(here, [])
      setStatus('error')
    }
  }

  const busy = status === 'locating' || status === 'loading'

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={find}
        disabled={busy}
        className="min-h-16 w-full rounded-lg bg-periwinkle border border-cool text-lg font-bold text-ink shadow-card disabled:border-sky disabled:bg-sky disabled:text-muted"
      >
        {status === 'locating'
          ? 'Finding your location…'
          : status === 'loading'
            ? 'Looking for cool spots…'
            : 'Find water or a cool place near me'}
      </button>

      {status === 'done' && usedFallback && (
        <p role="status" className="text-sm font-medium text-ink">
          We could not get your location, so results are near the ASU Tempe
          campus center.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="font-medium text-error-ink">
          We could not load nearby spots right now. Please try again.
        </p>
      )}
      {status === 'done' && resources.length === 0 && (
        <p>No water or cooling spots found nearby.</p>
      )}

      <ul className="space-y-2">
        {resources.map((r) => {
          const badge = openBadge(r.open_now)
          return (
            <li key={r.id} className="rounded-lg border border-sky bg-white p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-sm text-muted">
                    {KIND_LABEL[r.kind]}
                    {r.distance_m != null && ` · ${Math.round(r.distance_m)} m away`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${badge.cls}`}
                >
                  {badge.text}
                </span>
              </div>
              {r.hours_text && (
                <p className="mt-1 text-sm text-muted">{r.hours_text}</p>
              )}
              <button
                type="button"
                className="mt-2 min-h-11 w-full rounded-md border-2 border-cool font-semibold text-ink"
                onClick={() => origin && onWalk(origin, r)}
              >
                Show walking route
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

import { useState } from 'react'
import {
  DEFAULT_TIME,
  buildRequest,
  type FormValue,
  type PickTarget,
} from '../form'
import type { LatLng, Prefs, RouteRequest } from '../types'

interface Props {
  value: FormValue
  onChange: (next: FormValue) => void
  picking: PickTarget | null
  onPick: (target: PickTarget | null) => void
  onSubmit: (req: RouteRequest) => void
  loading: boolean
  /** Friendly names for a point (e.g. a searched place), shown instead of coordinates. */
  labels?: Partial<Record<PickTarget, string>>
  /** When set, routing is blocked and this message explains why. */
  notice?: string
}

const SENSITIVITY: Prefs['heat_sensitivity'][] = ['low', 'normal', 'high']
const btn = 'min-h-11 rounded-md border-2 border-cool px-3 text-sm font-semibold '
const btnIdle = btn + 'bg-white text-ink'
const btnOn = btn + 'bg-periwinkle text-ink'

const fmt = (p: LatLng | null) =>
  p ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : 'Not set'

export default function RouteForm({
  value,
  onChange,
  picking,
  onPick,
  onSubmit,
  loading,
  labels,
  notice,
}: Props) {
  const [geoError, setGeoError] = useState<string | null>(null)
  const request = notice ? null : buildRequest(value)

  const locate = (target: PickTarget) => {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('This device cannot share its location. Tap the map instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onChange({ ...value, [target]: point })
        onPick(null)
      },
      () =>
        setGeoError(
          'Could not get your location. Allow location access, or tap the map instead.',
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const pointRow = (target: PickTarget, label: string) => (
    <div className="rounded-lg border border-sky bg-powder p-3 shadow-card">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted">{labels?.[target] ?? fmt(value[target])}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={`${picking === target ? btnOn : btnIdle} flex-1`}
          aria-pressed={picking === target}
          onClick={() => onPick(picking === target ? null : target)}
        >
          {picking === target ? 'Tap the map now' : 'Set on map'}
        </button>
        <button
          type="button"
          className={`${btnIdle} flex-1`}
          onClick={() => locate(target)}
        >
          Use my location
        </button>
      </div>
    </div>
  )

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (request) onSubmit(request)
      }}
    >
      {pointRow('start', 'Start')}
      {pointRow('end', 'End')}
      {geoError && (
        <p role="alert" className="text-sm font-medium text-error-ink">
          {geoError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <label htmlFor="depart-time" className="font-semibold">
          Leave at
        </label>
        <input
          id="depart-time"
          type="time"
          required
          value={value.departTime}
          onChange={(e) =>
            onChange({ ...value, departTime: e.target.value || DEFAULT_TIME })
          }
          className="min-h-11 rounded-md border-2 border-neutral bg-white px-3 text-base"
        />
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
        Avoid stairs
        <input
          type="checkbox"
          className="h-6 w-6 accent-cool"
          checked={value.prefs.avoid_stairs}
          onChange={(e) =>
            onChange({
              ...value,
              prefs: { ...value.prefs, avoid_stairs: e.target.checked },
            })
          }
        />
      </label>

      <fieldset>
        <legend className="mb-1 font-semibold">Heat sensitivity</legend>
        <div className="flex gap-2">
          {SENSITIVITY.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={value.prefs.heat_sensitivity === s}
              className={`${value.prefs.heat_sensitivity === s ? btnOn : btnIdle} flex-1 capitalize`}
              onClick={() =>
                onChange({
                  ...value,
                  prefs: { ...value.prefs, heat_sensitivity: s },
                })
              }
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {notice ? (
        <p role="status" className="rounded-lg bg-lavender px-3 py-2 text-sm font-semibold text-ink">
          {notice}
        </p>
      ) : (
        !request && (
          <p className="text-sm text-muted">
            Set a start and an end to find a route.
          </p>
        )
      )}
      <button
        type="submit"
        disabled={!request || loading}
        className="min-h-12 w-full rounded-lg bg-periwinkle border border-cool text-base font-bold text-ink shadow-card disabled:border-sky disabled:bg-sky disabled:text-muted"
      >
        {loading ? 'Finding route…' : 'Find cool route'}
      </button>
    </form>
  )
}

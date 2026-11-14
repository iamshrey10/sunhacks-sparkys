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
}

const SENSITIVITY: Prefs['heat_sensitivity'][] = ['low', 'normal', 'high']
const btn = 'min-h-11 rounded-lg border-2 border-sky-900 px-3 text-sm font-semibold '
const btnIdle = btn + 'bg-white text-sky-950'
const btnOn = btn + 'bg-sky-900 text-white'

const fmt = (p: LatLng | null) =>
  p ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : 'Not set'

export default function RouteForm({
  value,
  onChange,
  picking,
  onPick,
  onSubmit,
  loading,
}: Props) {
  const [geoError, setGeoError] = useState<string | null>(null)
  const request = buildRequest(value)

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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-slate-700">{fmt(value[target])}</span>
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
        <p role="alert" className="text-sm font-medium text-red-800">
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
          className="min-h-11 rounded-lg border-2 border-sky-900 bg-white px-3 text-base"
        />
      </div>

      <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
        Avoid stairs
        <input
          type="checkbox"
          className="h-6 w-6 accent-sky-900"
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

      <button
        type="submit"
        disabled={!request || loading}
        className="min-h-12 w-full rounded-xl bg-gradient-to-r from-sky-900 to-teal-700 shadow-md text-base font-bold text-white disabled:bg-slate-500"
      >
        {loading ? 'Finding route…' : 'Find cool route'}
      </button>
      {!request && (
        <p className="text-sm text-slate-700">
          Set a start and an end to find a route.
        </p>
      )}
    </form>
  )
}

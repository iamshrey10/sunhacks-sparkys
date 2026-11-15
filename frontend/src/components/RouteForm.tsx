import { Check } from 'lucide-react'
import { useState } from 'react'
import {
  DEFAULT_TIME,
  buildRequest,
  type FormValue,
  type PickTarget,
} from '../form'
import type { LatLng, Prefs, RouteRequest } from '../types'
import SunArc from './SunArc'

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
  /** The time was set and let go: ask for a fresh route if one is showing. */
  onTimeCommit?: (time: string) => void
}

const SENSITIVITY: Prefs['heat_sensitivity'][] = ['low', 'normal', 'high']
const btn = 'min-h-11 rounded-full border-2 border-cool px-3 text-sm font-semibold '
const btnIdle = btn + 'bg-white text-ink'
const btnOn = btn + 'bg-periwinkle text-ink'

// Quick times. The routes use hourly shade layers, so these are good choices.
const TIME_CHIPS = [
  { label: '12 PM', time: '12:00' },
  { label: '3 PM', time: '15:00' },
  { label: '6 PM', time: '18:00' },
]

/** The current time in Tempe (no daylight saving), as HH:MM. */
const tempeNow = () =>
  new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Phoenix',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

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
  onTimeCommit,
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

      <fieldset>
        <legend className="mb-1 font-semibold">Leave at</legend>
        <SunArc
          value={value.departTime}
          onChange={(time) => onChange({ ...value, departTime: time })}
          onCommit={(time) => onTimeCommit?.(time)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {[{ label: 'Now', time: tempeNow() }, ...TIME_CHIPS].map((c) => {
            const on = value.departTime === c.time
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={on}
                className={`${on ? btnOn : btnIdle} inline-flex items-center gap-1.5 tabular-nums`}
                onClick={() => {
                  onChange({ ...value, departTime: c.time })
                  onTimeCommit?.(c.time)
                }}
              >
                {on && <Check size={16} aria-hidden="true" />}
                {c.label}
              </button>
            )
          })}
        </div>
        {/* Native time field: visually hidden, still reachable by keyboard and assistive tech. */}
        <input
          id="depart-time"
          type="time"
          required
          aria-label="Other time"
          value={value.departTime}
          onChange={(e) =>
            onChange({ ...value, departTime: e.target.value || DEFAULT_TIME })
          }
          className="sr-only"
        />
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold">Preferences</legend>
        <button
          type="button"
          aria-pressed={value.prefs.avoid_stairs}
          className={`${value.prefs.avoid_stairs ? btnOn : btnIdle} inline-flex items-center gap-1.5`}
          onClick={() =>
            onChange({
              ...value,
              prefs: { ...value.prefs, avoid_stairs: !value.prefs.avoid_stairs },
            })
          }
        >
          {value.prefs.avoid_stairs && <Check size={16} aria-hidden="true" />}
          Avoid stairs
        </button>
      </fieldset>

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
        className="btn-sheen min-h-12 w-full rounded-lg bg-periwinkle border border-cool text-base font-bold text-ink shadow-card disabled:border-sky disabled:bg-sky disabled:text-ink"
      >
        {loading ? 'Finding route…' : 'Find cool route'}
      </button>
    </form>
  )
}

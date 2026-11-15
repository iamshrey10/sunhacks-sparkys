import type { Walk } from '../hooks/useWalk'
import type { DirectionsResponse } from '../types'
import { ManeuverIcon } from '../walkUi'
import { formatDistance, formatMinutes } from '../walkFormat'
import { currentAndNext, walkHeadline } from '../walkLogic'

interface Props {
  directions: DirectionsResponse
  walk: Walk
  /** True once the walk has ended at the destination. */
  arrived: boolean
  onStop: () => void
  /** Ask for a new route from where you are now. */
  onReroute: () => void
}

export default function WalkPanel({
  directions,
  walk,
  arrived,
  onStop,
  onReroute,
}: Props) {
  const t = walk.tracking
  const { current, next } = currentAndNext(directions.steps, t?.progress_m ?? 0)

  return (
    <section aria-label="Walking now" className="space-y-3 pt-1">
      <div
        aria-live="polite"
        className="flex items-center gap-3 rounded-lg border border-cool bg-powder p-3 shadow-card"
      >
        <span className="shrink-0 text-cool">
          <ManeuverIcon maneuver={arrived ? 'arrive' : (next?.maneuver ?? 'arrive')} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">{walkHeadline(directions, walk, arrived)}</p>
          {!arrived && t && (
            <p className="text-sm text-muted">
              {current.street ? `On ${current.street} · ` : ''}
              {Math.round(current.shade_pct)}% shade here
            </p>
          )}
        </div>
      </div>

      {t && (
        <dl className="flex gap-2 text-sm">
          <div className="flex-1 rounded-lg border border-sky bg-white p-3">
            <dt className="text-muted">Left to walk</dt>
            <dd className="text-xl font-extrabold">{formatDistance(t.remaining_m)}</dd>
          </div>
          <div className="flex-1 rounded-lg border border-sky bg-white p-3">
            <dt className="text-muted">Time left</dt>
            <dd className="text-xl font-extrabold">{formatMinutes(t.remaining_s)}</dd>
          </div>
        </dl>
      )}

      {walk.gpsError && (
        <p role="alert" className="rounded-lg bg-error px-3 py-2 text-sm font-semibold text-error-ink">
          {walk.gpsError}
        </p>
      )}
      {walk.offline && (
        <p role="status" className="rounded-lg bg-sun px-3 py-2 text-sm font-semibold">
          Can't reach the server. Showing your last update.
        </p>
      )}

      {t?.off_route && !arrived && (
        <div role="alert" className="rounded-lg bg-lavender p-3">
          <p className="text-sm font-bold">You are off the route.</p>
          <button
            type="button"
            onClick={onReroute}
            className="mt-2 min-h-11 w-full rounded-lg border border-cool bg-periwinkle text-base font-bold text-ink"
          >
            Find a route from here
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onStop}
        className="min-h-11 w-full rounded-lg bg-sky text-base font-bold text-ink"
      >
        {arrived ? 'Done' : 'Stop walking'}
      </button>
      <p className="text-xs text-muted">
        Your position is sent to the server only while you walk, and is not stored.
      </p>
    </section>
  )
}

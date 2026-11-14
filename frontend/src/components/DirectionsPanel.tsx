import { useEffect, useState } from 'react'
import { api, USE_MOCKS } from '../api'
import type {
  DirectionsResponse,
  LatLng,
  RouteRequest,
  RouteResponse,
} from '../types'
import { ManeuverIcon, PlaceIcon } from '../walkUi'
import { formatDistance, placeKindLabel } from '../walkFormat'

interface Props {
  route: RouteResponse
  /** The request that produced `route`, so the steps match the line on the map. */
  request: RouteRequest
  kind: 'fastest' | 'coolest'
  onKindChange: (kind: 'fastest' | 'coolest') => void
  /** Begin live tracking along the chosen route. */
  onStart: (directions: DirectionsResponse) => void
  /** Centre the map on a point (a step or a place). */
  onFocus: (point: LatLng) => void
}

const PREVIEW_STEPS = 4

/** Turn-by-turn preview of the chosen route, places along it, and Start walking. */
export default function DirectionsPanel({
  route,
  request,
  kind,
  onKindChange,
  onStart,
  onFocus,
}: Props) {
  // The latest answer, tagged with what it was asked for: an answer for an older
  // route or kind is ignored instead of being cleared from inside the effect.
  const [result, setResult] = useState<{
    route: RouteResponse
    kind: string
    data: DirectionsResponse | null
  } | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (USE_MOCKS) return
    let current = true
    api
      .directions({ route: request, kind })
      .then((data) => current && setResult({ route, kind, data }))
      .catch(() => current && setResult({ route, kind, data: null }))
    return () => {
      current = false
    }
  }, [route, request, kind])

  const answered = result?.route === route && result.kind === kind ? result : null
  const data = answered?.data ?? null
  const failed = answered !== null && answered.data === null

  // Sample data has no directions: never show made-up steps.
  if (USE_MOCKS) return null

  const steps = data?.steps ?? []
  const shown = showAll ? steps : steps.slice(0, PREVIEW_STEPS)

  return (
    <section aria-label="Directions" className="mb-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">Directions</h2>
        <div className="flex gap-1 rounded-lg bg-sky p-1" role="group" aria-label="Route to follow">
          {(['coolest', 'fastest'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => {
                setShowAll(false)
                onKindChange(k)
              }}
              className={`min-h-11 rounded-md px-3 text-sm font-bold ${
                kind === k ? 'bg-periwinkle text-ink shadow-card' : 'text-ink hover:bg-powder'
              }`}
            >
              {k === 'coolest' ? 'Coolest' : 'Fastest'}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <p role="status" className="rounded-lg bg-powder px-3 py-2 text-sm">
          Directions are not available right now.
        </p>
      )}
      {!data && !failed && (
        <p className="rounded-lg bg-powder px-3 py-2 text-sm text-muted">Loading directions…</p>
      )}

      {data && (
        <>
          <ol className="space-y-1">
            {shown.map((s, i) => (
              <li key={`${s.start_along_m}-${i}`}>
                <button
                  type="button"
                  onClick={() => onFocus(s.location)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-sky bg-white px-3 py-2 text-left"
                >
                  <span className="shrink-0 text-cool">
                    <ManeuverIcon maneuver={s.maneuver} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{s.instruction}</span>
                    {s.maneuver !== 'arrive' && (
                      <span className="block text-xs text-muted">
                        {formatDistance(s.distance_m)} · {Math.round(s.shade_pct)}% shade
                        {s.stairs ? ' · stairs' : ''}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {steps.length > PREVIEW_STEPS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="min-h-11 w-full rounded-lg bg-powder text-sm font-bold text-ink"
            >
              {showAll ? 'Show fewer steps' : `Show all ${steps.length} steps`}
            </button>
          )}

          {data.places.length > 0 && (
            <div>
              <h3 className="text-sm font-bold">Along the way</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {data.places.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onFocus(p.location)}
                      className="flex min-h-11 items-center gap-2 rounded-full border border-sky bg-white px-3 text-sm"
                    >
                      <span className="text-cool">
                        <PlaceIcon group={p.group} />
                      </span>
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-muted">
                        {placeKindLabel(p)} · {formatDistance(p.distance_m)} off route
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">
                From OpenStreetMap. Opening hours are not checked.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onStart(data)}
            className="min-h-11 w-full rounded-lg border border-cool bg-periwinkle text-base font-bold text-ink shadow-card"
          >
            Start walking
          </button>
        </>
      )}
    </section>
  )
}

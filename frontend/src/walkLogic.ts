import type { Walk } from './hooks/useWalk'
import type { DirectionsResponse, DirectionStep } from './types'
import { formatDistance } from './walkFormat'

/** The step you are on, the next one, and how far it is. */
export function currentAndNext(
  steps: DirectionStep[],
  progressM: number,
): { current: DirectionStep; next: DirectionStep | null } {
  const walking = steps.filter((s) => s.maneuver !== 'arrive')
  let index = 0
  walking.forEach((s, i) => {
    if (s.start_along_m <= progressM) index = i
  })
  return { current: walking[index] ?? steps[0], next: steps[index + 1] ?? null }
}

/** The short line shown when the panel is folded away. */
export function walkHeadline(
  directions: DirectionsResponse,
  walk: Walk,
  arrived: boolean,
): string {
  if (arrived) return "You've arrived"
  if (walk.gpsError) return walk.gpsError
  const t = walk.tracking
  if (!t) return 'Finding your location…'
  const { next } = currentAndNext(directions.steps, t.progress_m)
  if (!next) return `${formatDistance(t.remaining_m)} to go`
  const to = Math.max(0, next.start_along_m - t.progress_m)
  return next.maneuver === 'arrive'
    ? `Arrive in ${formatDistance(to)}`
    : `${next.instruction} in ${formatDistance(to)}`
}

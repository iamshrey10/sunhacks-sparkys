import { useEffect, useRef, useState } from 'react'
import type { LatLng, NearbyPlace } from '../types'
import { PlaceIcon } from '../walkUi'
import { formatDistance, placeKindLabel } from '../walkFormat'

interface Props {
  /** Places around you from the latest /track answer. */
  nearby: NearbyPlace[]
  /** Distance from the bottom of the screen, so it floats above the sheet. */
  bottom: number
  onShow: (point: LatLng) => void
}

const SHOW_FOR_MS = 10000

/**
 * Pops up one nearby restaurant, cafe, bar or sight at a time while you walk,
 * the first time it comes within range. Each place is shown once per walk, ahead
 * of you before behind you. Mount it only while walking, so it resets between walks.
 */
export default function NearbyPopup({ nearby, bottom, onShow }: Props) {
  const [current, setCurrent] = useState<NearbyPlace | null>(null)
  const seen = useRef(new Set<string>())

  useEffect(() => {
    if (current) return
    const next = nearby.find((p) => !seen.current.has(p.id) && p.ahead !== false)
    if (!next) return
    seen.current.add(next.id)
    setCurrent(next)
  }, [nearby, current])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => setCurrent(null), SHOW_FOR_MS)
    return () => clearTimeout(timer)
  }, [current])

  if (!current) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-x-3 z-[1240] flex items-center gap-3 rounded-lg border border-sky bg-white p-3 shadow-pop"
      style={{ bottom: bottom + 12 }}
    >
      <span className="shrink-0 text-cool">
        <PlaceIcon group={current.group} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold">{current.name}</p>
        <p className="text-sm text-muted">
          {placeKindLabel(current)} · {formatDistance(current.distance_m)} away
          {current.ahead ? ' · ahead' : ''}
        </p>
        {current.listed_hours && (
          <p className="truncate text-xs text-muted">Listed hours: {current.listed_hours}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onShow(current.location)}
        className="min-h-11 shrink-0 rounded-md bg-powder px-3 text-sm font-bold text-ink"
      >
        Show
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setCurrent(null)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl font-bold leading-none text-ink"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}

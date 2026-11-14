import { useCallback, useState } from 'react'
import type { PlaceKind } from '../data/places'

const KEY = 'coolroute.recents'
const MAX = 4

export interface Recent {
  id: string
  name: string
  kind: PlaceKind
  lat: number
  lng: number
  outsideRoutes?: boolean
}

function load(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (r): r is Recent =>
          r &&
          typeof r.id === 'string' &&
          typeof r.name === 'string' &&
          typeof r.lat === 'number' &&
          typeof r.lng === 'number',
      )
      .slice(0, MAX)
  } catch {
    // Storage blocked or data corrupt: no recents.
    return []
  }
}

/** The last few chosen places, saved on this device. Works without storage too. */
export function useRecents(): [Recent[], (place: Recent) => void] {
  const [recents, setRecents] = useState<Recent[]>(load)
  const add = useCallback((place: Recent) => {
    setRecents((prev) => {
      const next = [place, ...prev.filter((r) => r.id !== place.id)].slice(0, MAX)
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* not saved; the list still works for this session */
      }
      return next
    })
  }, [])
  return [recents, add]
}

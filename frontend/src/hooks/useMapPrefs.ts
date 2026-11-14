import { useCallback, useState } from 'react'
import { DEFAULT_MAP_PREFS, type MapPrefs, type MapType } from '../mapLayers'

const KEY = 'coolroute.map'
const TYPES: MapType[] = ['standard', 'light', 'satellite']

const bool = (v: unknown, fallback: boolean) =>
  typeof v === 'boolean' ? v : fallback

function load(): MapPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_MAP_PREFS
    const p = JSON.parse(raw) as Partial<MapPrefs>
    return {
      type: TYPES.includes(p.type as MapType)
        ? (p.type as MapType)
        : DEFAULT_MAP_PREFS.type,
      spots: bool(p.spots, DEFAULT_MAP_PREFS.spots),
      bothRoutes: bool(p.bothRoutes, DEFAULT_MAP_PREFS.bothRoutes),
      labels: bool(p.labels, DEFAULT_MAP_PREFS.labels),
    }
  } catch {
    // Storage blocked or data corrupt: fall back to the defaults.
    return DEFAULT_MAP_PREFS
  }
}

/**
 * Map type and detail switches, saved on this device. Pass `save: false` for a
 * temporary change (e.g. falling back to Standard after a network failure) that
 * should not overwrite what the person chose.
 */
export function useMapPrefs(): [
  MapPrefs,
  (next: MapPrefs, options?: { save?: boolean }) => void,
] {
  const [prefs, setState] = useState<MapPrefs>(load)
  const setPrefs = useCallback((next: MapPrefs, options?: { save?: boolean }) => {
    setState(next)
    if (options?.save === false) return
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* not saved; the map still works */
    }
  }, [])
  return [prefs, setPrefs]
}

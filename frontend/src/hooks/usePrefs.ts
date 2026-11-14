import { useCallback, useState } from 'react'
import { DEFAULT_PREFS, type Prefs } from '../types'

const KEY = 'coolroute.prefs'

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<Prefs>
    return {
      avoid_stairs:
        typeof p.avoid_stairs === 'boolean'
          ? p.avoid_stairs
          : DEFAULT_PREFS.avoid_stairs,
      heat_sensitivity:
        p.heat_sensitivity === 'low' ||
        p.heat_sensitivity === 'normal' ||
        p.heat_sensitivity === 'high'
          ? p.heat_sensitivity
          : DEFAULT_PREFS.heat_sensitivity,
      shade_weight:
        typeof p.shade_weight === 'number' &&
        p.shade_weight >= 0 &&
        p.shade_weight <= 1
          ? p.shade_weight
          : DEFAULT_PREFS.shade_weight,
    }
  } catch {
    // Storage blocked or data corrupt: fall back to defaults.
    return DEFAULT_PREFS
  }
}

/** Preferences that survive a reload. Works without storage too. */
export function usePrefs(): [Prefs, (next: Prefs) => void] {
  const [prefs, setState] = useState<Prefs>(load)
  const setPrefs = useCallback((next: Prefs) => {
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* not saved; the app still works */
    }
  }, [])
  return [prefs, setPrefs]
}

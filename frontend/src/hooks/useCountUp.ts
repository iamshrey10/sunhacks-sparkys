import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Counts from the last shown value (0 the first time) up to `target` over about
 * 600 ms with an ease-out, using requestAnimationFrame. It always ends on
 * exactly `target`. With reduced motion the target is shown immediately.
 *
 * The value is in the same unit as `target`; format it however the static value
 * is formatted so the last frame is identical to the final number.
 */
export function useCountUp(target: number, duration = 600): number {
  const reduced = prefersReducedMotion()
  const [value, setValue] = useState(() => (reduced ? target : 0))
  const shown = useRef(value)

  useEffect(() => {
    if (reduced) {
      // Nothing to animate: the target is returned directly below.
      shown.current = target
      return
    }
    const from = shown.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = t >= 1 ? target : from + (target - from) * eased
      shown.current = next
      setValue(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])

  return reduced ? target : value
}

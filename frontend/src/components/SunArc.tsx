import { Sun } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'

// Geometry of the arc, in SVG units. The container keeps the same aspect ratio.
const W = 300
const H = 150
const CX = 150
const CY = 130
const R = 115
/** The arc runs from 6:00 AM (left) to 7:00 PM (right). */
const MIN = 360
const MAX = 1140
const STEP = 15
/** How close (in SVG units) a press must be to the arc to start a drag. */
const GRAB = 30
/** Wait this long after the last change before asking for a new route. */
const COMMIT_DELAY_MS = 350

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const fromMinutes = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
/** 15:00 -> "3:00 PM" */
const clockText = (m: number) => {
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const fraction = (m: number) => (clamp(m, MIN, MAX) - MIN) / (MAX - MIN)
const pointAt = (m: number) => {
  const theta = Math.PI * (1 - fraction(m))
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) }
}

interface Props {
  /** "HH:MM", the form's own time format. */
  value: string
  /** Called live while dragging or pressing keys. */
  onChange: (time: string) => void
  /** Called once the person lets go (debounced): the time to ask a route for. */
  onCommit: (time: string) => void
}

/**
 * A semicircular time control: drag the sun along the arc (6 AM to 7 PM, 15-minute
 * steps). The label updates live; the route is only re-requested on release. The
 * sun is an accessible slider (arrow keys by 15 minutes, Page keys by an hour,
 * Home and End jump to the ends).
 */
export default function SunArc({ value, onChange, onCommit }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const latest = useRef(value)
  const timer = useRef<number | undefined>(undefined)
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
    latest.current = value
  })
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const minutes = toMinutes(value)
  const f = fraction(minutes)
  const sun = pointAt(minutes)
  const start = pointAt(MIN)
  const end = pointAt(MAX)
  const arc = `M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`

  const change = (m: number) => {
    const next = fromMinutes(clamp(m, MIN, MAX))
    if (next === latest.current) return
    latest.current = next
    onChange(next)
  }
  const scheduleCommit = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => onCommitRef.current(latest.current),
      COMMIT_DELAY_MS,
    )
  }

  /** Time under the pointer, snapped to 15 minutes. */
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    const y = ((e.clientY - r.top) / r.height) * H
    const dx = x - CX
    const dy = CY - y
    // Below the baseline the sun sticks to the nearer end.
    const theta = dy < 0 ? (dx < 0 ? Math.PI : 0) : Math.atan2(dy, dx)
    const m = MIN + (1 - theta / Math.PI) * (MAX - MIN)
    return Math.round(m / STEP) * STEP
  }
  const nearArc = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    const y = ((e.clientY - r.top) / r.height) * H
    return Math.abs(Math.hypot(x - CX, y - CY) - R) <= GRAB
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!nearArc(e)) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    change(fromPointer(e))
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) change(fromPointer(e))
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    scheduleCommit()
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const m = clamp(minutes, MIN, MAX)
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = m + STEP
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = m - STEP
    else if (e.key === 'PageUp') next = m + 60
    else if (e.key === 'PageDown') next = m - 60
    else if (e.key === 'Home') next = MIN
    else if (e.key === 'End') next = MAX
    if (next === null) return
    e.preventDefault()
    change(next)
    scheduleCommit()
  }

  return (
    <div className="px-2">
      <div
        ref={box}
        className="relative mx-auto w-full max-w-[340px] select-none"
        style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={arc} fill="none" className="stroke-sky" strokeWidth="14" strokeLinecap="round" />
          <path
            d={arc}
            fill="none"
            pathLength="100"
            className="stroke-cool"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${f * 100} 100`}
          />
        </svg>

        {/* The time, in large type, in the middle of the arc. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
          <p className="text-3xl font-extrabold tabular-nums leading-none">{clockText(minutes)}</p>
          <p className="mt-1 text-xs text-muted">Drag the sun to set when you leave</p>
        </div>

        {/* The sun: a real, focusable slider with its own focus ring. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Leave at"
          aria-orientation="horizontal"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={clamp(minutes, MIN, MAX)}
          aria-valuetext={clockText(minutes)}
          onKeyDown={onKey}
          className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-4 border-white bg-sun-strong text-ink shadow-pop active:cursor-grabbing"
          style={{ left: `${(sun.x / W) * 100}%`, top: `${(sun.y / H) * 100}%` }}
        >
          <Sun size={20} aria-hidden="true" />
        </div>
      </div>
      <div className="mx-auto flex max-w-[340px] justify-between px-[8%] text-xs text-muted" aria-hidden="true">
        <span>6 AM</span>
        <span>7 PM</span>
      </div>
    </div>
  )
}

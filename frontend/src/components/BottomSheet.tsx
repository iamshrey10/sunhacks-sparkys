import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

export type Snap = 'peek' | 'half' | 'full'
const ORDER: Snap[] = ['peek', 'half', 'full']

const FULL_RATIO = 0.9
const HALF_RATIO = 0.45
/** Movement (px) before a press becomes a drag, so taps still click. */
const DRAG_THRESHOLD = 6
/** Release speed (px/ms) above which a flick moves to the next snap point. */
const FLICK_SPEED = 0.35
/** How far ahead (ms) a release is projected, so a flick carries the sheet. */
const PROJECT_MS = 200
const SETTLE_FALLBACK_MS = 320

interface Props {
  snap: Snap
  onSnapChange: (snap: Snap) => void
  /** Called once the sheet has stopped moving, with its visible height in px. */
  onSettled?: (visiblePx: number) => void
  /** Segmented control (draggable together with the handle). */
  tabs: ReactNode
  /** Always-visible block under the tabs: search bar and a one-line summary. */
  peek: ReactNode
  children: ReactNode
}

interface Drag {
  id: number
  el: HTMLElement
  startY: number
  startOffset: number
  active: boolean
  samples: { t: number; y: number }[]
  lastOffset: number
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))

/**
 * A bottom sheet with three snap heights. It floats over the map, drags with
 * pointer events (finger or mouse) and snaps using release velocity.
 *
 * It is positioned with a transform on a fixed-height panel, so dragging never
 * relayouts the page, and the map behind it never resizes.
 */
export default function BottomSheet({
  snap,
  onSnapChange,
  onSettled,
  tabs,
  peek,
  children,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ screen: 0, top: 0 })
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const drag = useRef<Drag | null>(null)
  const justDragged = useRef(false)

  // Measure the screen and the always-visible block (including the safe-area
  // padding), so the peek height fits its content on any phone and after rotation.
  useLayoutEffect(() => {
    const parent = sheetRef.current?.parentElement
    const top = topRef.current
    if (!parent || !top) return
    const read = () =>
      setDims({
        screen: parent.clientHeight,
        top: Math.ceil(top.getBoundingClientRect().height),
      })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(parent)
    ro.observe(top)
    return () => ro.disconnect()
  }, [])

  const measured = dims.screen > 0
  const full = Math.round(dims.screen * FULL_RATIO)
  const peekPx = Math.min(dims.top, full - 120)
  const half = Math.max(Math.round(dims.screen * HALF_RATIO), peekPx + 96)
  const heights: Record<Snap, number> = { peek: peekPx, half, full }
  const offsetOf = (s: Snap) => full - heights[s]
  const offset = dragOffset ?? offsetOf(snap)
  const maxOffset = full - peekPx

  // Tell the map once the sheet has stopped, never per frame.
  const onSettledRef = useRef(onSettled)
  useEffect(() => {
    onSettledRef.current = onSettled
  })
  const settleTimer = useRef<number | undefined>(undefined)
  const target = heights[snap]
  useEffect(() => {
    if (!measured) return
    settleTimer.current = window.setTimeout(
      () => onSettledRef.current?.(target),
      SETTLE_FALLBACK_MS,
    )
    return () => window.clearTimeout(settleTimer.current)
  }, [target, measured])

  const step = (from: Snap, dir: 1 | -1): Snap =>
    ORDER[clamp(ORDER.indexOf(from) + dir, 0, ORDER.length - 1)]

  const nearest = (off: number): Snap =>
    ORDER.reduce((best, s) =>
      Math.abs(offsetOf(s) - off) < Math.abs(offsetOf(best) - off) ? s : best,
    )

  const canStart = (e: PointerEvent<HTMLElement>) =>
    (e.pointerType !== 'mouse' || e.button === 0) &&
    !(e.target as Element).closest('input, textarea, select, [data-no-drag]')

  // The latest move/up logic, called from window listeners so a mouse drag keeps
  // working after the pointer leaves the handle (touch is captured implicitly).
  const live = useRef<{
    move: (e: globalThis.PointerEvent) => void
    up: (e: globalThis.PointerEvent) => void
  }>({ move: () => {}, up: () => {} })

  const stopListening = useRef<() => void>(() => {})

  const onDown = (e: PointerEvent<HTMLElement>) => {
    if (!canStart(e)) return
    stopListening.current()
    drag.current = {
      id: e.pointerId,
      el: e.currentTarget,
      startY: e.clientY,
      startOffset: offsetOf(snap),
      active: false,
      samples: [{ t: performance.now(), y: e.clientY }],
      lastOffset: offsetOf(snap),
    }
    const move = (ev: globalThis.PointerEvent) => live.current.move(ev)
    const up = (ev: globalThis.PointerEvent) => live.current.up(ev)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    stopListening.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      stopListening.current = () => {}
    }
  }

  const handleMove = (e: globalThis.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return
      d.active = true
      try {
        d.el.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone; window listeners still follow it */
      }
    }
    d.lastOffset = clamp(d.startOffset + dy, 0, maxOffset)
    const now = performance.now()
    d.samples.push({ t: now, y: e.clientY })
    while (d.samples.length > 2 && now - d.samples[0].t > 100) d.samples.shift()
    setDragOffset(d.lastOffset)
  }

  const handleUp = (e: globalThis.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    stopListening.current()
    if (!d.active) return
    try {
      if (d.el.hasPointerCapture(e.pointerId)) d.el.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    // The click that follows a drag must not press a button under the finger.
    justDragged.current = true
    window.setTimeout(() => (justDragged.current = false), 0)

    const first = d.samples[0]
    const last = d.samples[d.samples.length - 1]
    const dt = Math.max(1, last.t - first.t)
    const speed = (last.y - first.y) / dt // px/ms, positive = moving down
    let next = nearest(d.lastOffset + speed * PROJECT_MS)
    if (next === snap && Math.abs(speed) > FLICK_SPEED * 1.5) {
      next = step(snap, speed < 0 ? 1 : -1)
    }
    setDragOffset(null)
    onSnapChange(next)
  }

  useEffect(() => {
    live.current = { move: handleMove, up: handleUp }
  })
  useEffect(() => () => stopListening.current(), [])

  const swallowClickAfterDrag = (e: React.MouseEvent) => {
    if (justDragged.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onSnapChange(step(snap, 1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onSnapChange(step(snap, -1))
    }
  }

  const dragHandlers = {
    onPointerDown: onDown,
    onClickCapture: swallowClickAfterDrag,
  }

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label="Route planner"
      className={`absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-xl bg-white shadow-sheet will-change-transform ${
        dragOffset === null
          ? 'transition-transform duration-[250ms] ease-out motion-reduce:transition-none'
          : ''
      }`}
      style={{
        height: full,
        transform: `translateY(${offset}px)`,
        visibility: measured ? 'visible' : 'hidden',
      }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'transform') {
          window.clearTimeout(settleTimer.current)
          onSettled?.(target)
        }
      }}
    >
      <div ref={topRef} className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        {/* Drag area: the handle and the tabs. */}
        <div
          {...dragHandlers}
          className="select-none px-4 pb-2"
          style={{ touchAction: 'none' }}
        >
          <button
            type="button"
            aria-label="Resize panel"
            onKeyDown={onHandleKey}
            onClick={() => onSnapChange(snap === 'full' ? 'half' : step(snap, 1))}
            // The invisible ::before extends the tap area to 44 px without taking layout space.
            className="relative mx-auto flex h-8 w-16 items-center justify-center rounded-md before:absolute before:-top-3 before:-inset-x-4 before:bottom-0 before:content-['']"
          >
            <span className="h-1.5 w-10 rounded-full bg-neutral" />
          </button>
          {tabs}
        </div>
        {peek}
      </div>

      {/* Content: scrolls only at the full snap; otherwise dragging moves the sheet. */}
      <div
        {...(snap === 'full' ? {} : dragHandlers)}
        className={`min-h-0 flex-1 overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ${
          snap === 'full' ? 'overflow-y-auto' : 'select-none overflow-hidden'
        }`}
        style={{ touchAction: snap === 'full' ? 'pan-y' : 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

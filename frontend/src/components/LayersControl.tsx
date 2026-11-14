import { Layers, Map as MapIcon, Satellite, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { BASE_LAYERS, type MapPrefs, type MapType } from '../mapLayers'

interface Props {
  prefs: MapPrefs
  onChange: (next: MapPrefs) => void
  /** Raises the glass opacity so the controls stay readable over imagery. */
  strong: boolean
}

const TYPES: { type: MapType; icon: LucideIcon }[] = [
  { type: 'standard', icon: MapIcon },
  { type: 'light', icon: Sun },
  { type: 'satellite', icon: Satellite },
]

function Switch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink">{hint}</span>}
      </span>
      {/* The word on/off is read by screen readers via aria-checked; the track also shows it. */}
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border ${
          checked ? 'border-cool bg-cool' : 'border-neutral bg-white'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full ${
            checked ? 'left-5.5 bg-white' : 'left-0.5 bg-neutral'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * A round Layers button over the map and a small glass panel with the map type
 * (one of three) and independent detail switches. It lives outside the map in
 * the DOM, so taps on it never reach the map.
 */
export default function LayersControl({ prefs, onChange, strong }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const glass = `glass ${strong ? 'glass-strong' : ''}`

  // Tapping outside, or Escape, closes the panel.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const set = (patch: Partial<MapPrefs>) => onChange({ ...prefs, ...patch })
  // Only the satellite map draws its labels as a separate layer that can be hidden.
  const labelsFixed = prefs.type !== 'satellite'

  return (
    <div
      ref={wrapRef}
      // Below the search bar (header 44 + gap 12 + bar 48 + gap 12). The wrapper
      // ignores pointer events so the rest of the strip still pans the map.
      className="pointer-events-none absolute right-3 z-[1260] flex flex-col items-end gap-2"
      style={{
        top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 44px + 12px + 48px + 12px)',
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Map layers"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`${glass} pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-ink`}
      >
        <Layers size={22} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Map layers"
          className={`${glass} pointer-events-auto max-h-[60dvh] w-[280px] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl p-3`}
        >
          <h2 className="px-1 pb-2 text-sm font-bold text-ink">Map type</h2>
          <div role="radiogroup" aria-label="Map type" className="grid grid-cols-3 gap-2">
            {TYPES.map(({ type, icon: Icon }) => {
              const on = prefs.type === type
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ type })}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 px-1 py-2 text-xs font-bold text-ink ${
                    on ? 'border-cool bg-periwinkle' : 'border-transparent bg-powder'
                  }`}
                >
                  <Icon size={22} aria-hidden="true" />
                  {BASE_LAYERS[type].label}
                </button>
              )
            })}
          </div>

          <h2 className="px-1 pb-1 pt-4 text-sm font-bold text-ink">Map details</h2>
          <Switch
            label="Water and cooling spots"
            checked={prefs.spots}
            onChange={(spots) => set({ spots })}
          />
          <Switch
            label="Both routes"
            hint={prefs.bothRoutes ? undefined : 'Showing only the coolest route'}
            checked={prefs.bothRoutes}
            onChange={(bothRoutes) => set({ bothRoutes })}
          />
          <Switch
            label="Place labels"
            hint={labelsFixed ? 'Always on for this map type' : undefined}
            checked={labelsFixed ? true : prefs.labels}
            disabled={labelsFixed}
            onChange={(labels) => set({ labels })}
          />
        </div>
      )}
    </div>
  )
}

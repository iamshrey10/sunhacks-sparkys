import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * The map credits, tucked behind a small info button instead of a wide bar. The
 * map providers require the credit to be available, so it opens on one tap (and
 * closes by itself after a few seconds).
 */
export default function MapCredits({ credits }: { credits: string[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => setOpen(false), 7000)
    return () => window.clearTimeout(id)
  }, [open])

  const text = credits.map((c) => c.replace(/&copy;/g, '©')).join(' · ')

  return (
    <div
      className="absolute left-2 z-[1000] flex items-end gap-2"
      // Rides above the bottom sheet, like the credit bar it replaces (see index.css).
      style={{
        bottom: 'calc(min(var(--sheet-h, 0px), 100% - 7rem) + 8px)',
        transition: 'bottom 250ms ease-out',
      }}
    >
      <button
        type="button"
        aria-label="Map credits"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-ink shadow-card"
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && (
        <p
          role="note"
          className="max-w-[calc(100vw-4.5rem)] rounded-lg bg-white/90 px-2 py-1 text-[11px] leading-snug text-ink shadow-card"
        >
          Map: {text}
        </p>
      )}
    </div>
  )
}

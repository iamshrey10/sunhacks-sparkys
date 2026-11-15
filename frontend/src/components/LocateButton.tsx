import { LoaderCircle, LocateFixed } from 'lucide-react'

interface Props {
  onLocate: () => void
  busy: boolean
  strong?: boolean
}

/** Round button under the layers button: pan the map back to where you are. */
export default function LocateButton({ onLocate, busy, strong }: Props) {
  return (
    <div
      // Same column as the layers button (header 44 + gap 12 + bar 48 + gap 12), below it
      // (button 44 + gap 8). Lower than the layers panel, so that opens on top.
      className="pointer-events-none absolute right-3 z-[1259]"
      style={{
        top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 44px + 12px + 48px + 12px + 44px + 8px)',
      }}
    >
      <button
        type="button"
        aria-label="Show my location"
        onClick={onLocate}
        disabled={busy}
        className={`glass ${strong ? 'glass-strong' : ''} hairline pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-ink disabled:opacity-70`}
      >
        {busy ? (
          <LoaderCircle
            size={22}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <LocateFixed size={22} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

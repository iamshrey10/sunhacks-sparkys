import { Sparkles } from 'lucide-react'

/**
 * A small decorative orb beside the plain-English field: an aqua-to-lavender
 * radial gradient with a sparkle. It pulses only while something is loading.
 */
export default function AiOrb({ busy }: { busy: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--color-white),var(--color-glow-aqua)_55%,var(--color-glow-violet))] text-ink shadow-glow-aqua ${
        busy ? 'orb-pulse' : ''
      }`}
    >
      <Sparkles size={18} />
    </span>
  )
}

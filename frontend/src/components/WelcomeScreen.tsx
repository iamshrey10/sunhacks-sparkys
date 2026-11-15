import { Droplet, ShieldCheck, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LogoMark, Wordmark } from './Brand'

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Sun,
    title: 'Routes that follow the shade',
    text: 'Compare the fastest walk with the coolest one across ASU Tempe.',
  },
  {
    icon: Droplet,
    title: 'Water and cool spots nearby',
    text: 'With honest opening hours. If we do not know, we say so.',
  },
  {
    icon: ShieldCheck,
    title: 'Estimates, not measurements',
    text: 'Shade is modelled from map data, not measured on the street.',
  },
]

/** The first screen after the intro. No account is needed to use the app. */
export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[2900] flex flex-col overflow-y-auto px-6 text-ink transition-opacity duration-500 motion-reduce:transition-none ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(165deg, #e1f5f0 0%, #f4f8fb 48%, #fdeccf 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <LogoMark size={104} />
        <Wordmark className="mt-4 text-3xl" />
        <p className="mt-1 text-base text-muted">The coolest way to walk.</p>
        <ul className="mt-8 w-full max-w-sm space-y-3 text-left">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-lg bg-white/70 p-3 shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-powder text-cool">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-sm pt-2">
        <button
          type="button"
          onClick={onStart}
          className="min-h-14 w-full rounded-full border border-cool bg-periwinkle text-lg font-bold text-ink shadow-card"
        >
          Get started
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          No sign-in needed. Your preferences stay on this phone.
        </p>
      </div>
    </div>
  )
}

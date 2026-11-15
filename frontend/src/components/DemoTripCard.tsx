import { ChevronRight, Sparkles } from 'lucide-react'

interface Props {
  onRun: () => void
  loading: boolean
}

/** One tap fills in the demo trip and finds the route. */
export default function DemoTripCard({ onRun, loading }: Props) {
  return (
    <button
      type="button"
      onClick={onRun}
      disabled={loading}
      className="mb-3 flex min-h-16 w-full items-center gap-3 rounded-xl bg-gradient-to-r from-mint to-sun p-3 text-left shadow-card disabled:opacity-70"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-cool">
        <Sparkles size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Try the demo trip</span>
        <span className="block text-sm">Memorial Union to Tempe Beach Park, 3 PM</span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  )
}

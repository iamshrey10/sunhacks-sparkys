import { USE_MOCKS } from '../api'

/** Shown whenever mock data is on, so sample data never looks real. */
export default function SampleBadge() {
  if (!USE_MOCKS) return null
  return (
    <span
      role="status"
      className="rounded bg-amber-300 px-2 py-1 text-xs font-bold tracking-wide text-slate-900"
    >
      SAMPLE DATA
    </span>
  )
}

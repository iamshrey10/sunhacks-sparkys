import { USE_MOCKS } from '../api'

/** Shown whenever mock data is on, so sample data never looks real. */
export default function SampleBadge() {
  if (!USE_MOCKS) return null
  return (
    <span
      role="status"
      className="rounded-md bg-sun px-2 py-1 text-xs font-bold tracking-wide text-ink"
    >
      SAMPLE DATA
    </span>
  )
}

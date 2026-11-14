/** A pulsing placeholder block (still, if the person prefers reduced motion). */
function Block({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-sky motion-reduce:animate-none ${className}`}
    />
  )
}

/** Stands in for the route comparison while a route is loading. */
export function RouteSkeleton() {
  return (
    <div role="status" aria-label="Finding your route" className="mb-3 space-y-3">
      <div className="flex gap-2">
        <Block className="h-32 flex-1" />
        <Block className="h-32 flex-1" />
      </div>
      <Block className="h-11" />
    </div>
  )
}

/** Stands in for the nearby-places list while it loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading nearby places" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Block key={i} className="h-28" />
      ))}
    </div>
  )
}

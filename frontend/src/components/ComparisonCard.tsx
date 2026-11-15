import { extraWalkText, formatMin, minutes, verdict } from '../routeSummary'
import type { RouteOption, RouteResponse } from '../types'

interface Props {
  route: RouteResponse
  shadeWeight: number
  loading: boolean
  /** Optional plain-English summary; null when unavailable. */
  explanation?: string | null
  onShadeChange: (weight: number) => void
  /** Called when the person lets go of the slider: re-request the route. */
  onShadeCommit: () => void
}

/** The headline: how much sun the coolest route saves, or an honest "not much". */
function Hero({ route }: { route: RouteResponse }) {
  const v = verdict(route)
  return (
    <div
      className="relative hairline rounded-xl border bg-gradient-to-br from-mint to-sun p-4 shadow-card"
      aria-live="polite"
    >
      {v.meaningful ? (
        <>
          <p className="text-sm font-semibold">The coolest route saves you</p>
          <p className="text-3xl font-extrabold tabular-nums">
            {formatMin(v.sunSavedS)} min{' '}
            <span className="text-lg font-bold">less in the sun</span>
          </p>
          <p className="mt-1 text-sm font-semibold">{extraWalkText(v.extraS)}</p>
        </>
      ) : (
        <>
          <p className="text-lg font-extrabold">Not much cooler here</p>
          <p className="mt-1 text-sm font-semibold">
            {v.sunSavedS > 0
              ? `The coolest route saves only about ${formatMin(v.sunSavedS)} min in the sun, so the fastest route is a good choice.`
              : 'The coolest route has no less sun on this trip, so the fastest route is a good choice.'}
          </p>
        </>
      )}
    </div>
  )
}

/** One route: shade (teal) against sun (amber), with the numbers in words. */
function RouteBar({
  option,
  label,
  dot,
}: {
  option: RouteOption
  label: string
  dot: string
}) {
  const shade = Math.round(option.shade_pct)
  return (
    <div className="relative hairline rounded-lg border bg-gradient-to-br from-white to-powder p-3 shadow-card">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 font-bold">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
          {label}
        </span>
        <span className="text-sm tabular-nums text-muted">
          {minutes(option.duration_s)} min walk
        </span>
      </div>
      <div
        className="mt-2 flex h-3 overflow-hidden rounded-full bg-sun-strong"
        role="img"
        aria-label={`${shade} percent shade, ${formatMin(option.sun_exposed_s)} minutes in direct sun`}
      >
        <div className="h-full bg-cool" style={{ width: `${shade}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-sm tabular-nums">
        <span className="font-semibold">{shade}% shade</span>
        <span>{formatMin(option.sun_exposed_s)} min in sun</span>
      </div>
    </div>
  )
}

export default function ComparisonCard({
  route,
  shadeWeight,
  loading,
  explanation,
  onShadeChange,
  onShadeCommit,
}: Props) {
  const { fastest, coolest } = route

  return (
    <section aria-label="Route comparison" className="mb-3 space-y-3">
      <Hero route={route} />
      <div className="space-y-2">
        <RouteBar option={fastest} label="Fastest" dot="bg-neutral" />
        <RouteBar option={coolest} label="Coolest" dot="bg-cool" />
        <p className="flex gap-4 px-1 text-xs text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cool" /> Shade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sun-strong" /> Sun
          </span>
        </p>
      </div>
      {explanation && <p className="text-sm">{explanation}</p>}
      {coolest.stairs_count > 0 && (
        <p className="text-sm">
          Coolest route has {coolest.stairs_count}{' '}
          {coolest.stairs_count === 1 ? 'step' : 'steps'}.
        </p>
      )}
      <div>
        <label htmlFor="shade-weight" className="flex justify-between font-semibold">
          <span>Shade vs speed</span>
          <span className="text-sm text-muted">
            {loading ? 'Updating…' : `${Math.round(shadeWeight * 100)}% shade`}
          </span>
        </label>
        <input
          id="shade-weight"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={shadeWeight}
          onChange={(e) => onShadeChange(Number(e.target.value))}
          onPointerUp={onShadeCommit}
          onKeyUp={onShadeCommit}
          className="h-11 w-full accent-cool"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>Fastest</span>
          <span>Coolest</span>
        </div>
      </div>
    </section>
  )
}

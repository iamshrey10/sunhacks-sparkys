import { useCountUp } from '../hooks/useCountUp'
import WordReveal from './WordReveal'
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

/**
 * A number that counts up to its final value. The ticking digits are hidden from
 * screen readers (they would announce every frame); the final value is always
 * in the DOM for them. `format` is the same function the static value uses.
 */
function CountUp({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const shown = useCountUp(value)
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}

/** The headline: how much sun the coolest route saves, or an honest "not much". */
function Hero({ route }: { route: RouteResponse }) {
  const v = verdict(route)
  return (
    <div
      className="rise relative hairline rounded-xl border bg-gradient-to-br from-mint to-sun p-4 shadow-card"
      style={{ '--i': 0 } as React.CSSProperties}
      aria-live="polite"
    >
      {v.meaningful ? (
        <>
          <p className="text-sm font-semibold">The coolest route saves you</p>
          <p className="text-3xl font-extrabold tabular-nums">
            <CountUp value={v.sunSavedS} format={formatMin} /> min{' '}
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

/**
 * A ring that splits the walk into shade (teal) and sun (amber). The numbers are
 * always written out beside it, so colour is never the only signal.
 */
function Ring({ shadePct }: { shadePct: number }) {
  const r = 24
  const c = 2 * Math.PI * r
  const gap = 3
  const p = Math.min(100, Math.max(0, shadePct)) / 100
  const split = p > 0 && p < 1
  const shadeLen = Math.max(0, p * c - (split ? gap : 0))
  const sunLen = Math.max(0, (1 - p) * c - (split ? gap : 0))
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <g transform="rotate(-90 32 32)" fill="none" strokeWidth="8">
        <circle
          cx="32"
          cy="32"
          r={r}
          className="stroke-sun-strong"
          strokeDasharray={`${sunLen} ${c - sunLen}`}
          strokeDashoffset={-(shadeLen + (split ? gap : 0))}
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          className="stroke-cool"
          strokeDasharray={`${shadeLen} ${c - shadeLen}`}
        />
      </g>
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink text-sm font-extrabold tabular-nums"
      >
        {Math.round(shadePct)}%
      </text>
    </svg>
  )
}

/** One route: a shade/sun ring with the numbers in words. */
function RouteBar({
  option,
  label,
  dot,
  sunSavedS,
  index,
}: {
  option: RouteOption
  label: string
  dot: string
  /** For the coolest route: sun saved against the fastest, shown as a chip. */
  sunSavedS?: number
  /** Order of appearance, for the staggered rise. */
  index: number
}) {
  const shade = Math.round(option.shade_pct)
  const shadeShown = useCountUp(option.shade_pct)
  const showChip = sunSavedS !== undefined && sunSavedS > 0 && formatMin(sunSavedS) !== '0'
  return (
    <div
      className="rise relative hairline rounded-lg border bg-gradient-to-br from-white to-powder p-3 shadow-card"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <div
          role="img"
          aria-label={`${shade} percent shade, ${formatMin(option.sun_exposed_s)} minutes in direct sun`}
        >
          <Ring shadePct={shadeShown} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2 font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
              {label}
            </span>
            <span className="text-sm tabular-nums text-muted">
              <CountUp value={option.duration_s} format={(s) => String(minutes(s))} /> min walk
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 text-sm tabular-nums">
            <span className="font-semibold">{shade}% shade</span>
            <span>
              <CountUp value={option.sun_exposed_s} format={formatMin} /> min in sun
            </span>
          </div>
          {showChip && (
            <span
              key={sunSavedS}
              className="chip-pop mt-2 inline-block rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink"
            >
              <span aria-hidden="true">−{formatMin(sunSavedS)} min sun</span>
              <span className="sr-only">
                {formatMin(sunSavedS)} minutes less sun than the fastest route
              </span>
            </span>
          )}
        </div>
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
        <RouteBar option={fastest} label="Fastest" dot="bg-neutral" index={1} />
        <RouteBar
          option={coolest}
          label="Coolest"
          dot="bg-cool"
          sunSavedS={verdict(route).sunSavedS}
          index={2}
        />
        <p className="flex gap-4 px-1 text-xs text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cool" /> Shade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sun-strong" /> Sun
          </span>
        </p>
      </div>
      {explanation && <WordReveal key={explanation} text={explanation} />}
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

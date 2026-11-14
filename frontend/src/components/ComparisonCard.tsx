import type { RouteOption, RouteResponse } from '../types'
import { COOLEST_TOKEN, FASTEST_TOKEN, token } from '../colors'

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

const minutes = (s: number) => Math.round(s / 60)

function Column({
  option,
  label,
  color,
}: {
  option: RouteOption
  label: string
  color: string
}) {
  return (
    <div
      className="flex-1 rounded-lg border border-line bg-white p-3 shadow-card"
      style={{ borderTop: `5px solid ${color}` }}
    >
      <div className="font-bold">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-ink">
        {Math.round(option.shade_pct)}
        <span className="text-base font-bold">% shade</span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-amber"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-aqua" style={{ width: `${Math.round(option.shade_pct)}%` }}
        />
      </div>
      <dl className="mt-2 text-sm">
        <div className="flex justify-between">
          <dt>Walk</dt>
          <dd className="font-semibold">{minutes(option.duration_s)} min</dd>
        </div>
        <div className="flex justify-between">
          <dt>In sun</dt>
          <dd className="font-semibold">{minutes(option.sun_exposed_s)} min</dd>
        </div>
      </dl>
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
  const extra = minutes(coolest.duration_s) - minutes(fastest.duration_s)
  const sunSaved = minutes(fastest.sun_exposed_s) - minutes(coolest.sun_exposed_s)
  const extraText =
    extra > 0 ? `+${extra} min` : extra < 0 ? `${extra} min` : 'same time'

  return (
    <section aria-label="Route comparison" className="mb-3 space-y-2">
      <p className="rounded-lg bg-ice px-3 py-2 text-base font-bold text-deep">
        Coolest route: {extraText}, {sunSaved} min less in the sun
      </p>
      <div className="flex gap-2">
        <Column option={fastest} label="Fastest" color={token(FASTEST_TOKEN)} />
        <Column option={coolest} label="Coolest" color={token(COOLEST_TOKEN)} />
      </div>
      {explanation && <p className="text-sm">{explanation}</p>}
      {coolest.stairs_count > 0 && (
        <p className="text-sm">Coolest route has {coolest.stairs_count} steps.</p>
      )}
      <div>
        <label htmlFor="shade-weight" className="flex justify-between font-semibold">
          <span>Shade vs speed</span>
          <span className="text-sm text-neutral-ink">
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
          className="h-11 w-full accent-deep"
        />
        <div className="flex justify-between text-xs text-neutral-ink">
          <span>Fastest</span>
          <span>Coolest</span>
        </div>
      </div>
    </section>
  )
}

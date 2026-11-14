import type { RouteOption, RouteResponse } from '../types'
import { COOLEST_COLOR, FASTEST_COLOR } from '../colors'

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
      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
      style={{ borderTop: `5px solid ${color}` }}
    >
      <div className="font-bold">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-sky-950">
        {option.shade_pct}
        <span className="text-base font-bold">% shade</span>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-amber-200"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${option.shade_pct}%`, background: color }}
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
      <p className="rounded-xl bg-sky-100 px-3 py-2 text-base font-bold text-sky-950">
        Coolest route: {extraText}, {sunSaved} min less in the sun
      </p>
      <div className="flex gap-2">
        <Column option={fastest} label="Fastest" color={FASTEST_COLOR} />
        <Column option={coolest} label="Coolest" color={COOLEST_COLOR} />
      </div>
      {explanation && <p className="text-sm">{explanation}</p>}
      {coolest.stairs_count > 0 && (
        <p className="text-sm">Coolest route has {coolest.stairs_count} steps.</p>
      )}
      <div>
        <label htmlFor="shade-weight" className="flex justify-between font-semibold">
          <span>Shade vs speed</span>
          <span className="text-sm text-slate-700">
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
          className="h-11 w-full accent-sky-900"
        />
        <div className="flex justify-between text-xs text-slate-700">
          <span>Fastest</span>
          <span>Coolest</span>
        </div>
      </div>
    </section>
  )
}

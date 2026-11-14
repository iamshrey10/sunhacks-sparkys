import type { RouteOption, RouteResponse } from '../types'
import { COOLEST_COLOR, FASTEST_COLOR } from '../colors'

interface Props {
  route: RouteResponse
  shadeWeight: number
  loading: boolean
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
    <div className="flex-1 rounded-lg border border-slate-300 p-2">
      <div className="flex items-center gap-2 font-bold">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-5 rounded"
          style={{ background: color }}
        />
        {label}
      </div>
      <dl className="mt-1 text-sm">
        <div className="flex justify-between">
          <dt>Walk</dt>
          <dd className="font-semibold">{minutes(option.duration_s)} min</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shade</dt>
          <dd className="font-semibold">{option.shade_pct}%</dd>
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
      <p className="text-base font-bold text-sky-950">
        Coolest route: {extraText}, {sunSaved} min less in the sun
      </p>
      <div className="flex gap-2">
        <Column option={fastest} label="Fastest" color={FASTEST_COLOR} />
        <Column option={coolest} label="Coolest" color={COOLEST_COLOR} />
      </div>
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

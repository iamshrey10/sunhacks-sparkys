import {
  Building2,
  Clock,
  Droplets,
  Library,
  MapPin,
  Snowflake,
  Trees,
  TrainFront,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { PlaceKind } from '../data/places'
import type { Recent } from '../hooks/useRecents'
import { optionId, type PlaceResult } from '../search'

const KIND: Record<PlaceKind, { icon: LucideIcon; label: string }> = {
  campus: { icon: Building2, label: 'Campus' },
  library: { icon: Library, label: 'Library' },
  sports: { icon: Trophy, label: 'Sports' },
  transit: { icon: TrainFront, label: 'Transit' },
  park: { icon: Trees, label: 'Park' },
  street: { icon: MapPin, label: 'Street' },
  water: { icon: Droplets, label: 'Water' },
  cooling: { icon: Snowflake, label: 'Cooling center' },
  other: { icon: MapPin, label: 'Place' },
}

interface Props {
  query: string
  results: PlaceResult[]
  recents: Recent[]
  activeIndex: number
  listboxId: string
  onChoose: (place: PlaceResult | Recent) => void
  onChooseOnMap: () => void
}

function Highlighted({ name, match }: { name: string; match: [number, number] | null }) {
  if (!match) return <>{name}</>
  const [a, b] = match
  return (
    <>
      {name.slice(0, a)}
      <mark className="rounded-md bg-aqua/30 text-ink">{name.slice(a, b)}</mark>
      {name.slice(b)}
    </>
  )
}

function Row({
  id,
  active,
  place,
  match,
  recent,
  onChoose,
}: {
  id: string
  active: boolean
  place: Recent | PlaceResult
  match: [number, number] | null
  recent?: boolean
  onChoose: () => void
}) {
  const Icon = recent ? Clock : KIND[place.kind].icon
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      // Pressing a row must not blur the search field before the choice lands.
      onPointerDown={(e) => e.preventDefault()}
      onClick={onChoose}
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${
        active ? 'bg-ice' : 'hover:bg-ice'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ice text-deep">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">
          <Highlighted name={place.name} match={match} />
        </span>
        <span className="block truncate text-sm text-neutral-ink">
          {KIND[place.kind].label}
          {place.outsideRoutes && ' · Outside the walking-route area'}
        </span>
      </span>
    </li>
  )
}

/** Results, or recent searches while the box is empty. */
export default function SearchResults({
  query,
  results,
  recents,
  activeIndex,
  listboxId,
  onChoose,
  onChooseOnMap,
}: Props) {
  const typing = query.trim().length > 0
  const rows = typing ? results : recents

  return (
    <div className="pt-1">
      {!typing && recents.length > 0 && (
        <h2 className="px-3 pb-1 text-sm font-bold text-neutral-ink">Recent</h2>
      )}
      <ul id={listboxId} role="listbox" aria-label="Places" className="space-y-1">
        {rows.map((p, i) => (
          <Row
            key={p.id}
            id={optionId(listboxId, i)}
            active={i === activeIndex}
            place={p}
            match={'match' in p ? (p as PlaceResult).match : null}
            recent={!typing}
            onChoose={() => onChoose(p)}
          />
        ))}
      </ul>
      {typing && results.length === 0 && (
        <div role="status" className="px-3 py-4">
          <p className="font-semibold text-ink">
            No match. Tap the map to choose a point.
          </p>
          <button
            type="button"
            onClick={onChooseOnMap}
            className="mt-3 min-h-11 rounded-md border-2 border-deep px-4 font-semibold text-deep"
          >
            Choose on map
          </button>
        </div>
      )}
      {!typing && recents.length === 0 && (
        <p className="px-3 py-4 text-sm text-neutral-ink">
          Try Memorial Union, Hayden Library or Mill Ave.
        </p>
      )}
    </div>
  )
}

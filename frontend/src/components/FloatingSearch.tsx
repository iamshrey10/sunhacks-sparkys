import {
  Building2,
  Clock,
  Droplets,
  Library,
  MapPin,
  Search,
  Snowflake,
  TrainFront,
  Trees,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from 'react'
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

type Row = PlaceResult | Recent

interface Props {
  query: string
  onQueryChange: (value: string) => void
  results: PlaceResult[]
  recents: Recent[]
  activeIndex: number
  onActiveChange: (index: number) => void
  /** Whether the dropdown is showing. */
  open: boolean
  onOpen: () => void
  onClose: () => void
  onChoose: (place: Row) => void
  /** "No match" shortcut: let the person tap the map instead. */
  onChooseOnMap: () => void
  inputRef: RefObject<HTMLInputElement | null>
  /** Higher glass opacity, for readability over satellite imagery. */
  strong?: boolean
}

function Highlighted({
  name,
  match,
}: {
  name: string
  match: [number, number] | null
}) {
  if (!match) return <>{name}</>
  const [a, b] = match
  return (
    <>
      {name.slice(0, a)}
      <mark className="rounded-md bg-mint text-ink">{name.slice(a, b)}</mark>
      {name.slice(b)}
    </>
  )
}

/**
 * The "Where to?" bar floating over the top of the map, with a frosted-glass
 * dropdown of results. It lives outside the map in the DOM, so taps and drags on
 * it can never reach the map (no stray pins). The wrapper ignores pointer events
 * so the rest of the top strip still pans the map; only the bar and dropdown
 * take them.
 */
export default function FloatingSearch({
  query,
  onQueryChange,
  results,
  recents,
  activeIndex,
  onActiveChange,
  open,
  onOpen,
  onClose,
  onChoose,
  onChooseOnMap,
  inputRef,
  strong = false,
}: Props) {
  const listboxId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const typing = query.trim().length > 0
  const rows: Row[] = typing ? results : recents

  // Tapping outside the bar and dropdown closes it.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const bar = wrapRef.current?.querySelectorAll('[data-search-surface]')
      if (bar && ![...bar].some((el) => el.contains(e.target as Node))) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, onClose])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault()
      if (!open) onOpen()
      onActiveChange((activeIndex + 1) % rows.length)
    } else if (e.key === 'ArrowUp' && rows.length) {
      e.preventDefault()
      onActiveChange((activeIndex - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter' && open && rows[activeIndex]) {
      e.preventDefault()
      onChoose(rows[activeIndex])
    } else if (e.key === 'Escape') {
      // Stop the browser's own "clear the search field", which would reopen the list.
      e.preventDefault()
      onClose()
      inputRef.current?.blur()
    }
  }

  const showList = open && rows.length > 0
  const showEmpty = open && typing && results.length === 0
  const showHelp = open && !typing && recents.length === 0

  return (
    <div
      ref={wrapRef}
      // Above Leaflet (up to 1000) and the header (1200). Only the surfaces
      // below take pointer events; the rest of the strip passes through to the map.
      className="pointer-events-none absolute inset-x-3 z-[1300] flex flex-col gap-2"
      style={{ top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 44px + 12px)' }}
    >
      <div
        data-search-surface
        className={`glass hairline relative ${strong ? 'glass-strong' : ''} pointer-events-auto flex min-h-12 items-center gap-2 rounded-xl px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus`}
      >
        <Search size={20} className="shrink-0 text-ink" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Where to?"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && rows.length ? optionId(listboxId, activeIndex) : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Where to?"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            onOpen()
          }}
          onFocus={onOpen}
          onKeyDown={onKeyDown}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange('')
              onClose()
            }}
            className="-mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {(showList || showEmpty || showHelp) && (
        <div
          data-search-surface
          className={`glass ${strong ? 'glass-strong' : ''} pointer-events-auto max-h-[40dvh] overflow-y-auto overscroll-contain rounded-xl p-2`}
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {showList && (
            <>
              {!typing && (
                <h2 className="px-3 pb-1 pt-1 text-sm font-bold text-muted">Recent</h2>
              )}
              <ul id={listboxId} role="listbox" aria-label="Places" className="space-y-1">
                {rows.map((p, i) => {
                  const Icon = typing ? KIND[p.kind].icon : Clock
                  return (
                    <li
                      key={p.id}
                      id={optionId(listboxId, i)}
                      role="option"
                      aria-selected={i === activeIndex}
                      // Pressing a row must not blur the input before the choice lands.
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => onChoose(p)}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${
                        i === activeIndex ? 'bg-sky' : 'hover:bg-sky'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-powder text-ink">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          <Highlighted
                            name={p.name}
                            match={'match' in p ? (p as PlaceResult).match : null}
                          />
                        </span>
                        <span className="block truncate text-sm text-ink">
                          {KIND[p.kind].label}
                          {p.outsideRoutes && ' · Outside the walking-route area'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {showEmpty && (
            <div role="status" className="px-3 py-3">
              <p className="font-semibold text-ink">
                No match. Tap the map to choose a point.
              </p>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={onChooseOnMap}
                className="mt-3 min-h-11 rounded-lg border-2 border-cool bg-periwinkle px-4 font-semibold text-ink"
              >
                Choose on map
              </button>
            </div>
          )}
          {showHelp && (
            <p className="px-3 py-3 text-sm text-ink">
              Try Memorial Union, Hayden Library or Mill Ave.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

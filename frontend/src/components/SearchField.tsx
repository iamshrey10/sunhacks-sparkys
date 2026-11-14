import { Search, X } from 'lucide-react'
import type { KeyboardEvent, RefObject } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onClear: () => void
  /** Whether the result list is showing, and which row is highlighted. */
  expanded: boolean
  activeId?: string
  listboxId: string
  inputRef: RefObject<HTMLInputElement | null>
}

/** The "Where to?" field. Always visible, even when the sheet is at its lowest. */
export default function SearchField({
  value,
  onChange,
  onFocus,
  onKeyDown,
  onClear,
  expanded,
  activeId,
  listboxId,
  inputRef,
}: Props) {
  return (
    <div className="px-4 pb-2">
      <div className="flex min-h-12 items-center gap-2 rounded-lg border-2 border-neutral bg-white px-3 shadow-card focus-within:border-focus">
        <Search size={20} className="shrink-0 text-ink" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Where to?"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Where to?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

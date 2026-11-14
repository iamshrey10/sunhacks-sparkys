import { useEffect, useState } from 'react'
import { searchPlaces, type PlaceResult } from '../search'
import type { Resource } from '../types'

/** Query text, its results, and the highlighted row for keyboard navigation. */
export function useSearch(resources: Resource[]) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    let stale = false
    searchPlaces(query, { resources }).then((r) => {
      if (stale) return
      setResults(r)
      setActive(0)
    })
    return () => {
      stale = true
    }
  }, [query, resources])

  return { query, setQuery, results, active, setActive }
}

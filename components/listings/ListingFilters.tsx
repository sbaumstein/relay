'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { CLASS_TYPES } from '@/types'

export const SORT_OPTIONS = [
  { value: 'soonest', label: 'Soonest class' },
  { value: 'newest', label: 'Recently posted' },
  { value: 'latest', label: 'Furthest out' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

const selectClass =
  'bg-white/5 border border-white/20 text-sm text-white px-3 py-2.5 focus:outline-none ' +
  'focus:border-white/50 appearance-none cursor-pointer [&>option]:bg-neutral-900'

export function ListingFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const classType = searchParams.get('class_type') ?? ''
  const sort = searchParams.get('sort') ?? 'soonest'
  const queryParam = searchParams.get('q') ?? ''

  const [search, setSearch] = useState(queryParam)

  // Keep the box in step when the URL changes from elsewhere (back button, etc.)
  useEffect(() => setSearch(queryParam), [queryParam])

  const setParam = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === 'all' || (name === 'sort' && value === 'soonest')) {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      // replace, not push: typing shouldn't fill up browser history
      router.replace(pathname + (params.toString() ? '?' + params.toString() : ''))
    },
    [searchParams, router, pathname]
  )

  // Debounce so each keystroke isn't a navigation
  useEffect(() => {
    if (search === queryParam) return
    const t = setTimeout(() => setParam('q', search.trim()), 300)
    return () => clearTimeout(t)
  }, [search, queryParam, setParam])

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search class, studio or neighborhood…"
          className="w-full bg-white/5 border border-white/20 pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-3">
        {/* Class type */}
        <select
          value={classType || 'all'}
          onChange={(e) => setParam('class_type', e.target.value)}
          aria-label="Class type"
          className={`${selectClass} flex-1 sm:flex-none`}
        >
          <option value="all">All classes</option>
          {CLASS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          aria-label="Sort by"
          className={`${selectClass} flex-1 sm:flex-none`}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { CLASS_TYPES } from '@/types'

export const SORT_OPTIONS = [
  { value: 'soonest', label: 'Starting soonest' },
  { value: 'newest', label: 'Just added' },
  { value: 'latest', label: 'Furthest ahead' },
  { value: 'price_low', label: 'Cheapest first' },
  { value: 'price_high', label: 'Priciest first' },
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]['value']

/** Native select keeps the good mobile picker; the chevron is drawn on top. */
function Dropdown({
  value, onChange, label, children, className = '',
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full bg-white/5 border border-white/20 text-sm text-white pl-3 pr-9 py-2.5
                   cursor-pointer appearance-none transition-colors
                   hover:border-white/40 focus:outline-none focus:border-white/50
                   [&>option]:bg-neutral-900 [&>option]:text-white"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
    </div>
  )
}

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
        <Dropdown
          value={classType || 'all'}
          onChange={(v) => setParam('class_type', v)}
          label="Class type"
          className="flex-1 sm:w-40 sm:flex-none"
        >
          <option value="all">All classes</option>
          {CLASS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Dropdown>

        <Dropdown
          value={sort}
          onChange={(v) => setParam('sort', v)}
          label="Sort by"
          className="flex-1 sm:w-44 sm:flex-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Dropdown>
      </div>
    </div>
  )
}

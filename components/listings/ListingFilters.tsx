'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { CLASS_TYPES } from '@/types'
import type { ClassType } from '@/types'

export function ListingFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all' || value === '') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      router.push(pathname + (params.toString() ? '?' + params.toString() : ''))
    },
    [searchParams, router, pathname]
  )

  const classType = searchParams.get('class_type') ?? ''

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('class_type', 'all')}
        className={`text-xs px-4 py-1.5 border transition-colors ${
          !classType
            ? 'border-white text-white'
            : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
        }`}
      >
        All
      </button>
      {CLASS_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => setFilter('class_type', t.value)}
          className={`text-xs px-4 py-1.5 border transition-colors ${
            classType === t.value
              ? 'border-white text-white'
              : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

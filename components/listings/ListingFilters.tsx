'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CLASS_TYPES, NEIGHBORHOODS } from '@/types'
import type { ClassType } from '@/types'

export function ListingFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all' || value === '') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      return params.toString()
    },
    [searchParams]
  )

  const classType = searchParams.get('class_type') ?? ''
  const isFree = searchParams.get('is_free') ?? ''
  const neighborhood = searchParams.get('neighborhood') ?? ''

  const hasFilters = classType || neighborhood

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select
        value={classType || 'all'}
        onValueChange={(val) => {
          router.push(pathname + '?' + createQueryString('class_type', val))
        }}
      >
        <SelectTrigger className="w-36 bg-white">
          <SelectValue placeholder="Class type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {CLASS_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={neighborhood || 'all'}
        onValueChange={(val) => {
          router.push(pathname + '?' + createQueryString('neighborhood', val))
        }}
      >
        <SelectTrigger className="w-44 bg-white">
          <SelectValue placeholder="Neighborhood" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All neighborhoods</SelectItem>
          {NEIGHBORHOODS.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

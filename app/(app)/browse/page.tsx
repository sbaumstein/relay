import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { getSellerStats } from '@/types'
import type { ClassType, Listing } from '@/types'

interface BrowsePageProps {
  searchParams: Promise<{
    class_type?: string
    is_free?: string
    neighborhood?: string
  }>
}

async function ListingsGrid({ searchParams }: BrowsePageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select('*, seller:profiles!seller_id(id, full_name, email)')
    .eq('status', 'available')
    .gte('class_datetime', new Date().toISOString())
    .order('class_datetime', { ascending: true })
    .limit(50)

  if (params.class_type) query = query.eq('class_type', params.class_type as ClassType)
  if (params.is_free === 'true') query = query.eq('is_free', true)
  if (params.neighborhood) query = query.eq('neighborhood', params.neighborhood)

  const { data: listings } = await query

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No listings found</p>
        <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
      </div>
    )
  }

  // Fetch seller claim stats for all unique sellers
  const sellerIds = [...new Set(listings.map((l) => l.seller_id))]
  const { data: claimStats } = await supabase
    .from('claims')
    .select('seller_id, status')
    .in('seller_id', sellerIds)

  const statsMap: Record<string, { total: number; completed: number }> = {}
  for (const c of claimStats ?? []) {
    if (!statsMap[c.seller_id]) statsMap[c.seller_id] = { total: 0, completed: 0 }
    statsMap[c.seller_id].total++
    if (c.status === 'completed' || c.status === 'auto_released') {
      statsMap[c.seller_id].completed++
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => {
        const raw = statsMap[listing.seller_id] ?? { total: 0, completed: 0 }
        const stats = getSellerStats(raw.total, raw.completed)
        return <ListingCard key={listing.id} listing={listing as Listing} sellerStats={stats} />
      })}
    </div>
  )
}

export default function BrowsePage({ searchParams }: BrowsePageProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Available Spots</h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Claim a class from someone who can&apos;t make it
        </p>
      </div>

      <div className="mb-6">
        <Suspense>
          <ListingFilters />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        }
      >
        <ListingsGrid searchParams={searchParams} />
      </Suspense>

      <Link
        href="/listings/new"
        className="fixed bottom-8 right-8 h-14 w-14 bg-white text-black shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

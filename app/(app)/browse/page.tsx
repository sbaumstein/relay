import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { MapView } from '@/components/listings/MapView'
import { getSellerStats } from '@/types'
import type { ClassType, Listing } from '@/types'

interface BrowsePageProps {
  searchParams: Promise<{
    class_type?: string
    neighborhood?: string
  }>
}

async function BrowseContent({ searchParams }: BrowsePageProps) {
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
  if (params.neighborhood) query = query.eq('neighborhood', params.neighborhood)

  const { data: listings } = await query

  if (!listings || listings.length === 0) {
    return (
      <div className="flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
        <div className="flex-1 flex items-center justify-center text-white/60 text-sm border-t border-white/20">
          No spots available — check back soon
        </div>
        <div className="w-[420px] flex-shrink-0 sticky top-20" style={{ height: 'calc(100vh - 180px)' }}>
          <MapView listings={[]} />
        </div>
      </div>
    )
  }

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

  const mapListings = listings.map((l) => ({
    id: l.id,
    class_name: l.class_name,
    studio_name: l.studio_name,
    address: l.address,
    price_cents: l.price_cents,
  }))

  return (
    <div className="flex gap-6">
      {/* Listings list */}
      <div className="flex-1 min-w-0">
        <div className="border-t border-white/20">
          {listings.map((listing) => {
            const raw = statsMap[listing.seller_id] ?? { total: 0, completed: 0 }
            const stats = getSellerStats(raw.total, raw.completed)
            return <ListingCard key={listing.id} listing={listing as Listing} sellerStats={stats} />
          })}
        </div>
      </div>

      {/* Sticky map */}
      <div className="w-[400px] flex-shrink-0 hidden lg:block">
        <div className="sticky top-20" style={{ height: 'calc(100vh - 160px)' }}>
          <MapView listings={mapListings} />
        </div>
      </div>
    </div>
  )
}

export default function BrowsePage({ searchParams }: BrowsePageProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Available Spots</h1>
        <p className="text-white/70 mt-1 text-sm tracking-wide">
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
          <div className="flex gap-6">
            <div className="flex-1 border-t border-white/20">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 py-4 px-2 border-b border-white/20">
                  <div className="w-24 h-14 bg-white/8 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-white/8 animate-pulse" />
                    <div className="h-4 w-48 bg-white/8 animate-pulse" />
                  </div>
                  <div className="w-16 h-8 bg-white/8 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="w-[400px] flex-shrink-0 hidden lg:block bg-white/8 animate-pulse" style={{ height: 'calc(100vh - 160px)' }} />
          </div>
        }
      >
        <BrowseContent searchParams={searchParams} />
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

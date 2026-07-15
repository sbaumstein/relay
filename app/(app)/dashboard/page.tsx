import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/stripe/helpers'
import { CLASS_TYPES, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import type { Listing, Claim, Profile } from '@/types'
import { Plus } from 'lucide-react'
import { CheckInCard } from '@/components/claims/CheckInCard'

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    available:            'text-emerald-400 border-emerald-400/30',
    claimed:              'text-blue-400 border-blue-400/30',
    completed:            'text-blue-400 border-blue-400/30',
    auto_released:        'text-blue-400 border-blue-400/30',
    expired:              'text-white/60 border-white/20',
    cancelled:            'text-red-400 border-red-400/30',
    disputed:             'text-red-400 border-red-400/30',
    needs_review:         'text-orange-400 border-orange-400/30',
    pending_confirmation: 'text-yellow-400 border-yellow-400/30',
    pending_payment:      'text-yellow-400 border-yellow-400/30',
    refunded:             'text-white/60 border-white/20',
  }
  return (
    <span className={`text-xs border px-2 py-0.5 ${colors[status] ?? 'text-white/70 border-white/20'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  const [{ data: profile }, { data: myListings }, { data: myClaims }, { data: sellerClaims }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('claims').select('*, listing:listings(*, duration_minutes)').eq('claimer_id', user.id).order('created_at', { ascending: false }),
    supabase.from('claims').select('status').eq('seller_id', user.id),
  ])

  const p = profile as Profile | null
  const sellerTotal = sellerClaims?.length ?? 0
  const sellerCompleted = sellerClaims?.filter(
    (c) => c.status === 'completed' || c.status === 'auto_released'
  ).length ?? 0
  const sellerStats = getSellerStats(sellerTotal, sellerCompleted)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Profile</p>
        <h1 className="text-3xl font-bold text-white">{p?.full_name ?? user.email}</h1>
      </div>

      {/* Reputation */}
      <div className="border border-white/20 p-5 mb-10">
        <p className="text-xs text-white/60 uppercase tracking-widest mb-3">Seller reputation</p>
        <div className="flex items-center justify-between">
          <StarRating stars={sellerStats.stars} total={sellerStats.total} showLabel />
          <p className="text-sm text-white/70">
            {sellerStats.total < 5
              ? `${5 - sellerStats.total} more to unlock rating`
              : `${sellerStats.rate}% · escrow holds ${sellerStats.holdHours}hr`}
          </p>
        </div>
      </div>

      {/* My Listings */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/60 uppercase tracking-widest">My listings ({myListings?.length ?? 0})</p>
          <Link href="/listings/new" className="text-xs text-white/70 hover:text-white transition-colors">+ New</Link>
        </div>
        {!myListings || myListings.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20">No listings yet</p>
        ) : (
          <div className="border-t border-white/20">
            {myListings.map((listing) => {
              const l = listing as Listing
              const classDate = new Date(l.class_datetime)
              const typeLabel = CLASS_TYPES.find((t) => t.value === l.class_type)?.label
              return (
                <Link key={l.id} href={`/listings/${l.id}`} className="flex items-center gap-4 py-3.5 px-1 border-b border-white/20 hover:bg-white/6 transition-colors group">
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className="text-lg font-bold text-white leading-none">{classDate.getDate()}</p>
                    <p className="text-xs text-white/60">{classDate.toLocaleDateString('en-US', { month: 'short' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{l.class_name}</p>
                    <p className="text-xs text-white/70 truncate">{l.studio_name} · {typeLabel}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-3">
                    <StatusPill status={l.status} />
                    <p className="text-white font-semibold text-sm">{formatCents(l.price_cents)}</p>
                    <span className="text-white/40 group-hover:text-white/75 transition-colors">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* My Claims */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/60 uppercase tracking-widest">Claimed spots ({myClaims?.length ?? 0})</p>
        </div>
        {!myClaims || myClaims.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20">No claimed spots yet</p>
        ) : (
          <div className="border-t border-white/20">
            {myClaims.map((claim) => {
              const c = claim as Claim
              const l = c.listing as Listing & { duration_minutes?: number } | undefined
              if (!l) return null
              const classDate = new Date(l.class_datetime)
              const classEnd = new Date(classDate.getTime() + (l.duration_minutes ?? 60) * 60 * 1000)
              const now = new Date()
              const isPending = c.status === 'pending_confirmation'
              const classInFuture = classDate > now
              const needsCheckin = isPending && classEnd < now && !classInFuture
              return (
                <div key={c.id} className="py-3.5 px-1 border-b border-white/20">
                  <Link href={`/listings/${l.id}`} className="flex items-center gap-4 hover:bg-white/6 transition-colors group">
                    <div className="w-16 flex-shrink-0 text-center">
                      <p className="text-lg font-bold text-white leading-none">{classDate.getDate()}</p>
                      <p className="text-xs text-white/60">{classDate.toLocaleDateString('en-US', { month: 'short' })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{l.class_name}</p>
                      <p className="text-xs text-white/70 truncate">{l.studio_name}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <StatusPill status={c.status} />
                      <p className="text-white font-semibold text-sm">{formatCents(c.amount_cents)}</p>
                      <span className="text-white/40 group-hover:text-white/75 transition-colors">→</span>
                    </div>
                  </Link>
                  {isPending && classInFuture && (
                    <Link href={`/claims/${c.id}/dispute`} className="text-xs text-red-400/70 hover:text-red-400 mt-2 inline-block ml-20 transition-colors">
                      File a dispute
                    </Link>
                  )}
                  {needsCheckin && (
                    <div className="mt-2 ml-20">
                      <CheckInCard claimId={c.id} className={l.class_name} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/listings/new"
        className="fixed bottom-8 right-8 h-14 w-14 bg-white text-black flex items-center justify-center hover:scale-105 transition-transform z-50 shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

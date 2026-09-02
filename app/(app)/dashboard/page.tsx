import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/stripe/helpers'
import { CLASS_TYPES, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import type { Listing, Claim, Profile } from '@/types'
import { Plus } from 'lucide-react'
import { CheckInCard } from '@/components/claims/CheckInCard'
import { DisputeResponseCard } from '@/components/claims/DisputeResponseCard'
import { expireStaleListings } from '@/lib/expireListings'

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { color: string; label: string }> = {
    available:            { color: 'text-emerald-400 border-emerald-400/30', label: 'Available' },
    pending_payment:      { color: 'text-yellow-400 border-yellow-400/30',  label: 'Pending payment' },
    pending_confirmation: { color: 'text-yellow-400 border-yellow-400/30',  label: 'Pending' },
    claimed:              { color: 'text-blue-400 border-blue-400/30',      label: 'Claimed' },
    completed:            { color: 'text-emerald-400 border-emerald-400/30',label: 'Completed' },
    auto_released:        { color: 'text-emerald-400 border-emerald-400/30',label: 'Completed' },
    disputed:             { color: 'text-orange-400 border-orange-400/30',  label: 'Under dispute' },
    dispute_won:          { color: 'text-emerald-400 border-emerald-400/30',label: 'Dispute won' },
    dispute_lost:         { color: 'text-red-400 border-red-400/30',        label: 'Dispute lost' },
    needs_review:         { color: 'text-orange-400 border-orange-400/30',  label: 'Under review' },
    expired:              { color: 'text-white/40 border-white/10',         label: 'Expired' },
    cancelled:            { color: 'text-red-400 border-red-400/30',        label: 'Cancelled' },
    refunded:             { color: 'text-white/40 border-white/10',         label: 'Refunded' },
  }
  const s = styles[status] ?? { color: 'text-white/70 border-white/20', label: status.replace(/_/g, ' ') }
  return (
    <span className={`text-xs border px-2 py-0.5 ${s.color}`}>
      {s.label}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  // Mark any of this user's past listings as expired before rendering
  await expireStaleListings(supabase, user.id)

  const [{ data: profile }, { data: myListings }, { data: myClaims }, { data: sellerClaims }, { data: disputesAgainstMe }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .not('status', 'in', '("expired","cancelled")')
      .order('created_at', { ascending: false }),
    supabase.from('claims')
      .select('*, listing:listings(*, duration_minutes), checkin_responded_at, checkin_response')
      .eq('claimer_id', user.id)
      .not('status', 'in', '("completed","auto_released","refunded","dispute_won","dispute_lost")')
      .order('created_at', { ascending: false }),
    supabase.from('claims').select('status').eq('seller_id', user.id),
    supabase.from('claims')
      .select('*, listing:listings(class_name, studio_name)')
      .eq('seller_id', user.id)
      .eq('status', 'disputed')
      .order('disputed_at', { ascending: true }),
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

      {/* Disputes filed against me — highest priority, time-sensitive */}
      {disputesAgainstMe && disputesAgainstMe.length > 0 && (
        <div className="mb-10">
          <p className="text-xs text-orange-400 uppercase tracking-widest mb-4">
            Action needed ({disputesAgainstMe.length})
          </p>
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {disputesAgainstMe.map((d: any) => (
              <DisputeResponseCard
                key={d.id}
                claimId={d.id}
                className={d.listing?.class_name ?? 'your listing'}
                reason={d.dispute_reason}
                notes={d.dispute_notes}
                buyerEvidence={d.dispute_evidence_urls ?? []}
                deadline={d.seller_response_deadline}
                respondedAt={d.seller_responded_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Listings */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-white/60 uppercase tracking-widest">Active listings ({myListings?.length ?? 0})</p>
          <Link href="/listings/new" className="text-xs text-white/70 hover:text-white transition-colors">+ New</Link>
        </div>
        {!myListings || myListings.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20">No active listings</p>
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
          <p className="text-xs text-white/60 uppercase tracking-widest">Active claimed spots ({myClaims?.length ?? 0})</p>
        </div>
        {!myClaims || myClaims.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20">No active claimed spots</p>
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const alreadyResponded = !!(c as any).checkin_responded_at
              const needsCheckin = isPending && classEnd < now && !classInFuture && !alreadyResponded
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {alreadyResponded && isPending && (c as any).checkin_response === true && (
                    <p className="text-xs text-emerald-400 mt-1 ml-20">Checked in — escrow releasing to seller</p>
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

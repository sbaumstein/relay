import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/stripe/helpers'
import { CLASS_TYPES, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import type { Listing, Claim, Profile } from '@/types'
import { Plus } from 'lucide-react'
import { DisputeResponseCard } from '@/components/claims/DisputeResponseCard'
import { expireStaleListings } from '@/lib/expireListings'
import { monthShort, dayOfMonth, shortDateTimeLabel } from '@/lib/datetime'
import { releaseMaturedClaims, DEFAULT_HOLD_HOURS } from '@/lib/autoRelease'
import { getDisputeWindow } from '@/lib/disputeWindow'
import { HistorySection } from '@/components/dashboard/HistorySection'

function StatusPill({ status }: { status: string }) {
  // The stored names are historical: pending_confirmation dates from when a
  // seller had to confirm the handover. That step is gone, so it is simply the
  // claimed state now, and pending_payment is the one still settling.
  const styles: Record<string, { color: string; label: string }> = {
    available:            { color: 'text-emerald-400 border-emerald-400/30', label: 'Available' },
    pending_payment:      { color: 'text-yellow-400 border-yellow-400/30',  label: 'Pending' },
    pending_confirmation: { color: 'text-blue-400 border-blue-400/30',      label: 'Claimed' },
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

/** Settled listings and claims only need to be legible, not actionable. */
function PastRow({
  classDatetime, title, subtitle, status, amountCents,
}: {
  classDatetime: string
  title: string
  subtitle: string
  status: string
  amountCents: number
}) {
  const d = new Date(classDatetime)
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-white/10">
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-base font-semibold text-white/80 leading-none">{dayOfMonth(d)}</p>
        <p className="text-xs text-white/50">{monthShort(d)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm truncate">{title}</p>
        <p className="text-xs text-white/50 truncate">{subtitle}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        <StatusPill status={status} />
        <p className="text-white/70 text-sm">{formatCents(amountCents)}</p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  // Settle anything that has run its course before reading, so the page never
  // shows a deal that should already have concluded.
  await expireStaleListings(supabase, user.id)
  await releaseMaturedClaims(user.id)

  // Once escrow has released there is nothing left to act on, so a listing
  // drops off the profile at the same point.
  const holdCutoff = new Date(Date.now() - DEFAULT_HOLD_HOURS * 60 * 60 * 1000).toISOString()

  const [
    { data: profile },
    { data: myListings },
    { data: myClaims },
    { data: sellerClaims },
    { data: disputesAgainstMe },
    { data: pastListings },
    { data: pastClaims },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .in('status', ['available', 'claimed'])
      .gt('class_datetime', holdCutoff)
      .order('class_datetime', { ascending: true }),
    supabase.from('claims')
      .select('*, listing:listings(*, duration_minutes)')
      .eq('claimer_id', user.id)
      .not('status', 'in', '("completed","auto_released","refunded","dispute_won","dispute_lost")')
      .order('created_at', { ascending: false }),
    supabase.from('claims')
      .select('id, status, listing_id, seller_payout_cents, listing:listings(class_datetime, duration_minutes)')
      .eq('seller_id', user.id),
    supabase.from('claims')
      .select('*, listing:listings(class_name, studio_name)')
      .eq('seller_id', user.id)
      .eq('status', 'disputed')
      .order('disputed_at', { ascending: true }),
    // Settled history, shown collapsed under each section.
    supabase.from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .or(`status.in.(expired,cancelled),class_datetime.lte.${holdCutoff}`)
      .order('class_datetime', { ascending: false })
      .limit(50),
    supabase.from('claims')
      .select('*, listing:listings(*)')
      .eq('claimer_id', user.id)
      .in('status', ['completed', 'auto_released', 'refunded', 'dispute_won', 'dispute_lost'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Map each of the seller's listings to its live claim, so they can report a
  // problem from their own side of the deal.
  const sellerClaimByListing: Record<string, string> = {}
  for (const c of sellerClaims ?? []) {
    if (c.status === 'pending_confirmation' || c.status === 'claimed') {
      sellerClaimByListing[c.listing_id] = c.id
    }
  }

  const p = profile as Profile | null
  const sellerTotal = sellerClaims?.length ?? 0
  const sellerCompleted = sellerClaims?.filter(
    (c) => c.status === 'completed' || c.status === 'auto_released'
  ).length ?? 0
  const sellerStats = getSellerStats(sellerTotal, sellerCompleted)

  // Money held in escrow that is on its way to this seller, and when the
  // soonest of it settles.
  const escrowed = (sellerClaims ?? []).filter(
    (c) => c.status === 'pending_confirmation' || c.status === 'claimed'
  )
  const incomingCents = escrowed.reduce((sum, c) => sum + (c.seller_payout_cents ?? 0), 0)

  const boughtCount = (pastClaims ?? []).filter(
    (c) => c.status === 'completed' || c.status === 'auto_released'
  ).length

  const releaseDates = escrowed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c) => (c as any).listing)
    .filter((l) => l?.class_datetime)
    .map((l) => getDisputeWindow(l).closesAt.getTime())
  const nextRelease = releaseDates.length > 0 ? new Date(Math.min(...releaseDates)) : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-brand uppercase tracking-widest mb-1">Profile</p>
        <h1 className="text-3xl font-bold text-white">{p?.full_name ?? user.email}</h1>
      </div>

      {/* Rating */}
      <div className="border border-white/20 rounded-xl p-5 mb-10">
        <p className="text-xs text-brand uppercase tracking-widest mb-3">Rating</p>
        <StarRating stars={sellerStats.stars} total={sellerStats.total} size="md" showLabel />

        <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 mt-5 pt-4">
          <div className="pr-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Sold</p>
            <p className="text-xl font-bold text-white leading-tight mt-0.5">{sellerCompleted}</p>
          </div>
          <div className="px-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Bought</p>
            <p className="text-xl font-bold text-white leading-tight mt-0.5">{boughtCount}</p>
          </div>
          <div className="pl-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50">Incoming</p>
            <p className="text-xl font-bold text-white leading-tight mt-0.5">{formatCents(incomingCents)}</p>
          </div>
        </div>

        {nextRelease && (
          <p className="text-xs text-white/50 mt-3">
            {escrowed.length > 1 ? 'Next release' : 'Releases'} {shortDateTimeLabel(nextRelease)}
          </p>
        )}
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
      <HistorySection
        title={`My listings (${myListings?.length ?? 0})`}
        historyLabel="Previous listings"
        historyCount={pastListings?.length ?? 0}
        history={
          <div className="border-t border-white/10">
            {(pastListings ?? []).map((listing) => {
              const l = listing as Listing
              return (
                <PastRow
                  key={l.id}
                  classDatetime={l.class_datetime}
                  title={l.class_name}
                  subtitle={l.studio_name}
                  status={l.status}
                  amountCents={l.price_cents}
                />
              )
            })}
          </div>
        }
      >
        {!myListings || myListings.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20 rounded-xl">No listings yet</p>
        ) : (
          <div className="border-t border-white/20">
            {myListings.map((listing) => {
              const l = listing as Listing
              const classDate = new Date(l.class_datetime)
              const typeLabel = CLASS_TYPES.find((t) => t.value === l.class_type)?.label
              return (
                <div key={l.id} className="py-3.5 px-1 border-b border-white/20">
                  <Link href={`/listings/${l.id}`} className="flex items-center gap-4 hover:bg-white/6 transition-colors group">
                    <div className="w-16 flex-shrink-0 text-center">
                      <p className="text-lg font-bold text-white leading-none">{dayOfMonth(classDate)}</p>
                      <p className="text-xs text-white/60">{monthShort(classDate)}</p>
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
                  {sellerClaimByListing[l.id] && getDisputeWindow(l).isOpen && (
                    <Link
                      href={`/claims/${sellerClaimByListing[l.id]}/dispute?as=seller`}
                      className="text-xs text-white/40 hover:text-red-400 mt-2 inline-block ml-20 transition-colors"
                    >
                      Something went wrong?
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </HistorySection>

      {/* My Claims */}
      <HistorySection
        title={`My claims (${myClaims?.length ?? 0})`}
        historyLabel="Previous claims"
        historyCount={pastClaims?.length ?? 0}
        history={
          <div className="border-t border-white/10">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(pastClaims ?? []).map((c: any) => (
              <PastRow
                key={c.id}
                classDatetime={c.listing?.class_datetime ?? c.created_at}
                title={c.listing?.class_name ?? 'Class'}
                subtitle={c.listing?.studio_name ?? ''}
                status={c.status}
                amountCents={c.amount_cents}
              />
            ))}
          </div>
        }
      >
        {!myClaims || myClaims.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center border border-white/20 rounded-xl">No claims yet</p>
        ) : (
          <div className="border-t border-white/20">
            {myClaims.map((claim) => {
              const c = claim as Claim
              const l = c.listing as Listing & { duration_minutes?: number } | undefined
              if (!l) return null
              const classDate = new Date(l.class_datetime)
              // Nothing to do on the happy path — escrow settles on its own.
              // Reporting is only possible while the dispute window is open.
              const active = c.status === 'pending_confirmation' || c.status === 'claimed'
              const canReport = active && getDisputeWindow(l).isOpen
              return (
                <div key={c.id} className="py-3.5 px-1 border-b border-white/20">
                  <Link href={`/listings/${l.id}`} className="flex items-center gap-4 hover:bg-white/6 transition-colors group">
                    <div className="w-16 flex-shrink-0 text-center">
                      <p className="text-lg font-bold text-white leading-none">{dayOfMonth(classDate)}</p>
                      <p className="text-xs text-white/60">{monthShort(classDate)}</p>
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
                  {canReport && (
                    <Link
                      href={`/claims/${c.id}/dispute?as=buyer`}
                      className="text-xs text-white/40 hover:text-red-400 mt-2 inline-block ml-20 transition-colors"
                    >
                      Something went wrong?
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </HistorySection>

      {/* FAB */}
      <Link
        href="/listings/new"
        className="fixed bottom-8 right-8 h-14 w-14 bg-white text-neutral-900 flex items-center justify-center hover:bg-emerald-400 hover:scale-105 transition-transform z-50 shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

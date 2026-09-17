import { createServiceClient } from '@/lib/supabase/server'
import { getDisputeWindow, DISPUTE_WINDOW_HOURS } from '@/lib/disputeWindow'

/**
 * Escrow settles when the dispute window closes: neither side raised anything,
 * so the class is taken to have gone fine. Flat for everyone regardless of
 * seller rating — one stated window is easier for both sides to reason about.
 */
export const DEFAULT_HOLD_HOURS = DISPUTE_WINDOW_HOURS

/** Claims still holding money that a silent buyer should conclude. */
const RELEASABLE = ['pending_confirmation', 'claimed']

/**
 * Releases escrow on claims whose hold has elapsed with no dispute and no
 * check-in. Runs at read time rather than on a schedule, so nothing has to be
 * running for escrow to settle.
 *
 * Disputed claims are never touched — those wait on an admin decision.
 */
export async function releaseMaturedClaims(sellerOrClaimerId?: string) {
  const service = createServiceClient()
  const now = new Date()

  let query = service
    .from('claims')
    .select('id, listing:listings(class_datetime, duration_minutes)')
    .in('status', RELEASABLE)

  if (sellerOrClaimerId) {
    query = query.or(`seller_id.eq.${sellerOrClaimerId},claimer_id.eq.${sellerOrClaimerId}`)
  }

  const { data: candidates, error } = await query
  if (error || !candidates || candidates.length === 0) return 0

  const due = candidates.filter((c) => {
    const listing = c.listing as unknown as
      { class_datetime?: string; duration_minutes?: number | null } | null
    if (!listing?.class_datetime) return false
    // Measured from when the class ends, not when it starts.
    return getDisputeWindow(
      { class_datetime: listing.class_datetime, duration_minutes: listing.duration_minutes },
      now,
    ).hasClosed
  })

  if (due.length === 0) return 0

  const { data: released } = await service
    .from('claims')
    .update({ status: 'auto_released', updated_at: now.toISOString() })
    .in('id', due.map((c) => c.id))
    .in('status', RELEASABLE)
    .select('id')

  return released?.length ?? 0
}

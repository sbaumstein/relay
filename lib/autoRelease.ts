import { createServiceClient } from '@/lib/supabase/server'

/**
 * Escrow settles this long after the class for everyone, regardless of seller
 * rating. The star-based expires_at is deliberately ignored: a single, stated
 * window is easier for both sides to reason about than a hold that varies.
 */
export const DEFAULT_HOLD_HOURS = 48

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
  const cutoff = new Date(now.getTime() - DEFAULT_HOLD_HOURS * 60 * 60 * 1000)

  let query = service
    .from('claims')
    .select('id, listing:listings(class_datetime)')
    .in('status', RELEASABLE)

  if (sellerOrClaimerId) {
    query = query.or(`seller_id.eq.${sellerOrClaimerId},claimer_id.eq.${sellerOrClaimerId}`)
  }

  const { data: candidates, error } = await query
  if (error || !candidates || candidates.length === 0) return 0

  const due = candidates.filter((c) => {
    const listing = c.listing as unknown as { class_datetime?: string } | null
    if (!listing?.class_datetime) return false
    return new Date(listing.class_datetime) <= cutoff
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

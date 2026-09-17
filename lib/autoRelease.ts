import { createServiceClient } from '@/lib/supabase/server'

/**
 * If nobody says otherwise, a class is assumed to have gone fine.
 * Used when a claim has no explicit expires_at.
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
  const fallbackCutoff = new Date(now.getTime() - DEFAULT_HOLD_HOURS * 60 * 60 * 1000)

  // Claims carry expires_at (class time + the seller's star-based hold). Where
  // it's missing, fall back to the flat 48 hours after the class.
  let query = service
    .from('claims')
    .select('id, expires_at, listing:listings(class_datetime)')
    .in('status', RELEASABLE)

  if (sellerOrClaimerId) {
    query = query.or(`seller_id.eq.${sellerOrClaimerId},claimer_id.eq.${sellerOrClaimerId}`)
  }

  const { data: candidates, error } = await query
  if (error || !candidates || candidates.length === 0) return 0

  const due = candidates.filter((c) => {
    if (c.expires_at) return new Date(c.expires_at) <= now

    const listing = c.listing as unknown as { class_datetime?: string } | null
    if (!listing?.class_datetime) return false
    return new Date(listing.class_datetime) <= fallbackCutoff
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

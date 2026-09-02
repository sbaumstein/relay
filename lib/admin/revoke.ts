import { stripe } from '@/lib/stripe/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Claim states where money is still held and the deal has not concluded. */
const ACTIVE_CLAIM_STATUSES = [
  'pending_payment',
  'pending_confirmation',
  'claimed',
  'disputed',
]

export interface RevokeResult {
  refundedAsSeller: number
  refundedAsBuyer: number
  listingsCancelled: number
  spotsReleased: number
  errors: string[]
}

async function refund(paymentIntentId: string | null, errors: string[]) {
  if (!paymentIntentId || !process.env.STRIPE_SECRET_KEY) return
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId })
  } catch (e) {
    errors.push(`Stripe refund failed for ${paymentIntentId}: ${(e as Error).message}`)
  }
}

/**
 * Unwinds everything a banned user is involved in:
 *   - Claims on their listings are refunded to the buyer and closed.
 *   - Claims they made are refunded to them, closed, and the spot is put
 *     back on browse so the (unbanned) seller can resell it.
 *   - All of their own listings are cancelled.
 *
 * Best-effort: a Stripe failure is collected rather than aborting, so a
 * ban never half-applies.
 */
export async function revokeBannedUserActivity(
  service: SupabaseClient,
  userId: string,
): Promise<RevokeResult> {
  const errors: string[] = []
  const now = new Date().toISOString()

  // 1. Claims where the banned user is the SELLER — buyer gets their money back.
  const { data: asSeller } = await service
    .from('claims')
    .select('id, stripe_payment_intent_id')
    .eq('seller_id', userId)
    .in('status', ACTIVE_CLAIM_STATUSES)

  for (const c of asSeller ?? []) {
    await refund(c.stripe_payment_intent_id, errors)
  }
  if (asSeller?.length) {
    const { error } = await service
      .from('claims')
      .update({ status: 'refunded', updated_at: now })
      .in('id', asSeller.map((c) => c.id))
    if (error) errors.push(`Closing seller-side claims failed: ${error.message}`)
  }

  // 2. Claims the banned user MADE — refund them and free the spot.
  const { data: asBuyer } = await service
    .from('claims')
    .select('id, listing_id, stripe_payment_intent_id')
    .eq('claimer_id', userId)
    .in('status', ACTIVE_CLAIM_STATUSES)

  for (const c of asBuyer ?? []) {
    await refund(c.stripe_payment_intent_id, errors)
  }
  if (asBuyer?.length) {
    const { error } = await service
      .from('claims')
      .update({ status: 'refunded', updated_at: now })
      .in('id', asBuyer.map((c) => c.id))
    if (error) errors.push(`Closing buyer-side claims failed: ${error.message}`)
  }

  // Put those spots back on browse. Future classes only — a class that has
  // already started can't be resold.
  let spotsReleased = 0
  const releaseIds = (asBuyer ?? []).map((c) => c.listing_id).filter(Boolean)
  if (releaseIds.length > 0) {
    const { data: released, error } = await service
      .from('listings')
      .update({ status: 'available', updated_at: now })
      .in('id', releaseIds)
      .eq('status', 'claimed')
      .gt('class_datetime', now)
      .select('id')
    if (error) errors.push(`Releasing claimed spots failed: ${error.message}`)
    spotsReleased = released?.length ?? 0
  }

  // 3. Every listing the banned user owns comes down, claimed ones included.
  //    Runs last so it can't be undone by the release step above.
  const { data: cancelled, error: cancelError } = await service
    .from('listings')
    .update({ status: 'cancelled', updated_at: now })
    .eq('seller_id', userId)
    .in('status', ['available', 'claimed'])
    .select('id')
  if (cancelError) errors.push(`Cancelling listings failed: ${cancelError.message}`)

  return {
    refundedAsSeller: asSeller?.length ?? 0,
    refundedAsBuyer: asBuyer?.length ?? 0,
    listingsCancelled: cancelled?.length ?? 0,
    spotsReleased,
    errors,
  }
}

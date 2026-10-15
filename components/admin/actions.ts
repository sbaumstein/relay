'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/auth'

/**
 * Admin-only server actions.
 *
 * Every export here re-verifies getAdminUser() on its own. The admin PAGE also
 * checks, but these are independently callable endpoints (that is what a server
 * action is), so the page's check is not their authorisation — theirs is.
 *
 * They use createServiceClient() deliberately: RLS correctly blocks an admin's
 * own session from reading two strangers' messages, so an adjudicating admin
 * can only see a thread through the service role. Nothing here returns a row
 * until the getAdminUser() check has passed.
 */

export type AdminThreadMessage = {
  id: string
  claim_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

export type AdminThreadResult =
  | { ok: true; messages: AdminThreadMessage[]; buyerId: string; sellerId: string }
  | { ok: false; error: string }

/**
 * The full conversation attached to one claim, oldest first.
 *
 * Scoped to the single claim rather than to everything the two people have ever
 * said to each other: the admin is adjudicating this transaction, and reading
 * private correspondence should be no broader than the question being decided.
 */
export async function loadClaimThread(claimId: string): Promise<AdminThreadResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Unauthorized' }
  if (!claimId) return { ok: false, error: 'claim_id is required' }

  const service = createServiceClient()

  const { data: claim } = await service
    .from('claims')
    .select('id, claimer_id, seller_id')
    .eq('id', claimId)
    .maybeSingle()

  if (!claim) return { ok: false, error: 'Claim not found' }

  const { data, error } = await service
    .from('messages')
    .select('id, claim_id, sender_id, body, created_at, read_at')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) {
    // The messages table may not exist in a given environment — degrade to a
    // readable message rather than throwing through the action boundary.
    console.error('[admin] thread read failed', error)
    return { ok: false, error: 'Messages are unavailable in this environment.' }
  }

  return {
    ok: true,
    messages: (data ?? []) as AdminThreadMessage[],
    buyerId: claim.claimer_id,
    sellerId: claim.seller_id,
  }
}

export type ReportStatus = 'open' | 'resolved' | 'dismissed'

/** Move a report out of (or back into) the open queue. */
export async function setReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Unauthorized' }
  if (status !== 'open' && status !== 'resolved' && status !== 'dismissed') {
    return { ok: false, error: 'Invalid status' }
  }

  const service = createServiceClient()
  const { error } = await service
    .from('message_reports')
    .update({
      status,
      handled_at: status === 'open' ? null : new Date().toISOString(),
      handled_by: status === 'open' ? null : admin.id,
    })
    .eq('id', reportId)

  if (error) {
    console.error('[admin] report status update failed', error)
    return { ok: false, error: 'Could not update this report.' }
  }

  return { ok: true }
}

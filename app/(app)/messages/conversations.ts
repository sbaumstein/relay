import type { createClient } from '@/lib/supabase/server'
import { dayOfMonth, monthShort } from '@/lib/datetime'

/**
 * Conversations are grouped by PERSON, in the application layer only.
 *
 * messages.claim_id stays exactly as the migration defines it — it is what the
 * RLS policy checks, and it is what enforces the invariant that you can only
 * message someone you have a real transaction with. A conversation with person
 * X is therefore defined here as: every message on every claim where {me, X}
 * are the two parties.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Statuses where the transaction is live, so a new message belongs on it. */
export const ACTIVE_CLAIM_STATUSES = ['pending_confirmation', 'claimed'] as const

export type SharedClaim = {
  id: string
  otherId: string
  /** True when the signed-in user is the buyer (claimer) on this claim. */
  iAmBuyer: boolean
  status: string
  createdAt: string
  className: string
  studioName: string
  classDatetime: string | null
}

type ClaimRow = {
  id: string
  claimer_id: string
  seller_id: string
  status: string
  created_at: string
  listing?: {
    id: string
    class_name: string | null
    studio_name: string | null
    class_datetime: string | null
  } | null
}

const CLAIM_SELECT =
  'id, claimer_id, seller_id, status, created_at, listing:listings(id, class_name, studio_name, class_datetime)'

/**
 * Every claim the user is a party to, newest first.
 *
 * claims has split per-side SELECT policies, so each side is read on its own
 * rather than with a single OR that one policy might not cover.
 */
export async function loadMyClaims(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SharedClaim[]> {
  const [{ data: asBuyer }, { data: asSeller }] = await Promise.all([
    supabase.from('claims').select(CLAIM_SELECT).eq('claimer_id', userId),
    supabase.from('claims').select(CLAIM_SELECT).eq('seller_id', userId),
  ])

  const byId = new Map<string, ClaimRow>()
  for (const row of [...(asBuyer ?? []), ...(asSeller ?? [])] as unknown as ClaimRow[]) {
    byId.set(row.id, row)
  }

  return [...byId.values()]
    .map((row) => {
      const iAmBuyer = row.claimer_id === userId
      return {
        id: row.id,
        otherId: iAmBuyer ? row.seller_id : row.claimer_id,
        iAmBuyer,
        status: row.status,
        createdAt: row.created_at,
        className: row.listing?.class_name ?? 'Class',
        studioName: row.listing?.studio_name ?? '',
        classDatetime: row.listing?.class_datetime ?? null,
      }
    })
    // Server-side comparator on real timestamps — no Date.now() involved.
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** The claims shared with one specific person, newest first. */
export async function loadSharedClaims(
  supabase: SupabaseServerClient,
  userId: string,
  otherId: string
): Promise<SharedClaim[]> {
  const all = await loadMyClaims(supabase, userId)
  return all.filter((c) => c.otherId === otherId)
}

export const isActiveClaim = (status: string) =>
  (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(status)

/**
 * Which claim a new message attaches to: the most recently created shared
 * claim that is still active. Null once every shared claim has settled — the
 * conversation closes with the business it was about, so the thread stays
 * readable but can no longer be added to.
 *
 * Resolved server-side and handed to the client; the client never picks a
 * claim id, because the RLS insert policy (rightly) rejects any claim the
 * sender is not party to.
 *
 * `claims` must already be sorted newest-first (loadSharedClaims does that).
 */
export function pickSendClaim(claims: SharedClaim[]): SharedClaim | null {
  return claims.find((c) => isActiveClaim(c.status)) ?? null
}

/** "Power Ride 45 · Oct 16" — the divider label for a run of messages. */
export function claimLabel(claim: SharedClaim): string {
  const when = claim.classDatetime
    ? `${monthShort(claim.classDatetime)} ${dayOfMonth(claim.classDatetime)}`
    : null
  return when ? `${claim.className} · ${when}` : claim.className
}

export function claimLabelMap(claims: SharedClaim[]): Record<string, string> {
  return Object.fromEntries(claims.map((c) => [c.id, claimLabel(c)]))
}

/**
 * Counterparty display names. Never selects or returns an email address.
 */
export async function loadCounterpartyNames(
  supabase: SupabaseServerClient,
  ids: string[]
): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  return new Map((data ?? []).map((p) => [p.id, p.full_name]))
}

export const counterpartyLabel = (
  fullName: string | null | undefined,
  iAmBuyer: boolean
) => fullName || (iAmBuyer ? 'Seller' : 'Buyer')

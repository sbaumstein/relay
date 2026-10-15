import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBanned, BANNED_MESSAGE } from '@/lib/admin/ban'
import { loadSharedClaims } from '@/app/(app)/messages/conversations'
import { sendNewMessageEmail } from '@/lib/resend/client'

const MAX_BODY_LENGTH = 2000

/**
 * Conversations are per PERSON but messages are still stored per claim: a
 * conversation with X is every message on every claim where {caller, X} are
 * the two parties. Membership is validated server-side on every verb — the
 * client's claim_id is never taken on trust, and `sender_id` always comes
 * from the session.
 */

/**
 * Membership check done server-side, never trusting the client: the caller must
 * be the buyer or the seller on this claim. Uses the caller's own (RLS-scoped)
 * client, so a non-party can't even see the row.
 */
async function loadClaimForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  claimId: string,
  userId: string
) {
  const { data } = await supabase
    .from('claims')
    .select(
      'id, claimer_id, seller_id, listing:listings(class_name, studio_name)'
    )
    .eq('id', claimId)
    .or(`claimer_id.eq.${userId},seller_id.eq.${userId}`)
    .maybeSingle()

  return data
}

/**
 * Resolve the set of claim ids a request addresses.
 *
 * `user_id` → every claim shared with that person (the whole conversation).
 * `claim_id` → that one claim, if the caller is party to it.
 * Returns null when the caller is not a party / nothing is shared, which the
 * callers turn into a 404.
 */
async function resolveClaimIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  params: { claimId?: string | null; otherUserId?: string | null }
): Promise<string[] | null> {
  if (params.otherUserId) {
    if (params.otherUserId === userId) return null
    const shared = await loadSharedClaims(supabase, userId, params.otherUserId)
    return shared.length > 0 ? shared.map((c) => c.id) : null
  }

  if (params.claimId) {
    const claim = await loadClaimForUser(supabase, params.claimId, userId)
    return claim ? [params.claimId] : null
  }

  return null
}

// GET /api/messages?user_id=... — the whole conversation with a person, across
// every claim the two of you share, oldest first.
// GET /api/messages?claim_id=... — still supported, scoped to one claim.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const otherUserId = request.nextUrl.searchParams.get('user_id')
  const claimId = request.nextUrl.searchParams.get('claim_id')
  if (!otherUserId && !claimId) {
    return NextResponse.json({ error: 'user_id or claim_id is required' }, { status: 400 })
  }

  const claimIds = await resolveClaimIds(supabase, user.id, { claimId, otherUserId })
  if (!claimIds) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
    .in('claim_id', claimIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messages] read failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}

// POST /api/messages — send a message on a claim you are party to. The claim
// is resolved on the server before it reaches here (see the conversation page);
// it is re-validated below regardless, because the RLS insert policy will
// reject any claim the sender is not genuinely a party to.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await isBanned(user.id)) {
    return NextResponse.json({ error: BANNED_MESSAGE }, { status: 403 })
  }

  const { claim_id, body } = await request.json()
  if (!claim_id) return NextResponse.json({ error: 'claim_id is required' }, { status: 400 })

  const trimmed = typeof body === 'string' ? body.trim() : ''
  if (!trimmed) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (trimmed.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_BODY_LENGTH} characters or fewer` },
      { status: 400 }
    )
  }

  const claim = await loadClaimForUser(supabase, claim_id, user.id)
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  // Checked BEFORE the insert, so the message about to be written doesn't count
  // itself: if the recipient already has an unread message from this sender on
  // this claim, they were emailed about it and haven't come back, so another
  // email would just be noise.
  const hasPendingUnread = await (async () => {
    const { count, error: unreadError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('claim_id', claim_id)
      .eq('sender_id', user.id)
      .is('read_at', null)
    // On an error, assume there is an unread backlog rather than risk spamming.
    if (unreadError) return true
    return (count ?? 0) > 0
  })()

  // sender_id comes from the session, never the request body, so neither party
  // can post a message attributed to the other.
  const { data, error } = await supabase
    .from('messages')
    .insert({ claim_id, sender_id: user.id, body: trimmed })
    .select('*')
    .single()

  if (error) {
    console.error('[messages] insert failed', error)
    return NextResponse.json({ error: `Could not send message: ${error.message}` }, { status: 500 })
  }

  // Fire-and-forget notification to the OTHER party. Never awaited into the
  // response path and never allowed to throw: a Resend outage must not stop a
  // message the user already saw saved.
  if (process.env.RESEND_API_KEY && !hasPendingUnread) {
    notifyRecipient({
      claim,
      senderId: user.id,
      body: trimmed,
    }).catch((e) => console.error('[messages] notification failed', e))
  }

  return NextResponse.json({ message: data })
}

type ClaimForNotify = NonNullable<Awaited<ReturnType<typeof loadClaimForUser>>>

/**
 * Emails the counterparty about a freshly inserted message.
 *
 * The recipient is derived from the claim, never the request, and their address
 * is read server-side from `profiles` with the service client (a user cannot
 * read another profile's email under RLS). The sender's address is never used.
 */
async function notifyRecipient({
  claim,
  senderId,
  body,
}: {
  claim: ClaimForNotify
  senderId: string
  body: string
}) {
  const recipientId = claim.claimer_id === senderId ? claim.seller_id : claim.claimer_id
  if (!recipientId || recipientId === senderId) return

  const serviceSupabase = createServiceClient()
  const { data: profiles } = await serviceSupabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', [recipientId, senderId])

  const recipient = profiles?.find((p) => p.id === recipientId)
  const sender = profiles?.find((p) => p.id === senderId)
  if (!recipient?.email) return

  // The generated types describe an embedded one-to-one join as an array, so
  // normalize before reading it.
  type ListingBits = { class_name: string | null; studio_name: string | null }
  const embedded = (claim as unknown as { listing?: ListingBits | ListingBits[] | null }).listing
  const listing: ListingBits | null = Array.isArray(embedded) ? embedded[0] ?? null : embedded ?? null

  await sendNewMessageEmail({
    recipientEmail: recipient.email,
    recipientName: recipient.full_name ?? null,
    senderName: sender?.full_name ?? null,
    senderId,
    className: listing?.class_name ?? 'your class',
    studioName: listing?.studio_name ?? null,
    body,
  })
}

// PATCH /api/messages — mark the other party's messages as read, either for a
// whole conversation ({ user_id }) or for a single claim ({ claim_id }).
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { claim_id, user_id } = await request.json()
  if (!claim_id && !user_id) {
    return NextResponse.json({ error: 'user_id or claim_id is required' }, { status: 400 })
  }

  const claimIds = await resolveClaimIds(supabase, user.id, {
    claimId: claim_id,
    otherUserId: user_id,
  })
  if (!claimIds) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Service client only because the column-level grant on messages.read_at is
  // narrow and the recipient filter is enforced here as well as in RLS:
  // sender_id != caller means you can only mark what was sent TO you. The
  // claim ids were resolved above from claims the caller is a party to.
  const serviceSupabase = createServiceClient()
  const { error } = await serviceSupabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .in('claim_id', claimIds)
    .neq('sender_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[messages] mark read failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

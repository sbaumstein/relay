import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBanned, BANNED_MESSAGE } from '@/lib/admin/ban'

const MAX_BODY_LENGTH = 2000

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
    .select('id, claimer_id, seller_id')
    .eq('id', claimId)
    .or(`claimer_id.eq.${userId},seller_id.eq.${userId}`)
    .maybeSingle()

  return data
}

// GET /api/messages?claim_id=... — the thread, oldest first.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claimId = request.nextUrl.searchParams.get('claim_id')
  if (!claimId) return NextResponse.json({ error: 'claim_id is required' }, { status: 400 })

  const claim = await loadClaimForUser(supabase, claimId, user.id)
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messages] read failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}

// POST /api/messages — send a message on a claim you are party to.
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

  return NextResponse.json({ message: data })
}

// PATCH /api/messages — mark the other party's messages on a claim as read.
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { claim_id } = await request.json()
  if (!claim_id) return NextResponse.json({ error: 'claim_id is required' }, { status: 400 })

  const claim = await loadClaimForUser(supabase, claim_id, user.id)
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  // Service client only because the column-level grant on messages.read_at is
  // narrow and the recipient filter is enforced here as well as in RLS:
  // sender_id != caller means you can only mark what was sent TO you.
  const serviceSupabase = createServiceClient()
  const { error } = await serviceSupabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('claim_id', claim_id)
    .neq('sender_id', user.id)
    .is('read_at', null)

  if (error) {
    console.error('[messages] mark read failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

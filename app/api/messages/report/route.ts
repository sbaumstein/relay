import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_REASON_LENGTH = 1000

/**
 * POST /api/messages/report — report a conversation for abuse.
 *
 * Shaped like /api/messages: auth with the caller's own (RLS-scoped) client,
 * re-validate server-side that the reporter is genuinely a party to the claim,
 * and never take reporter_id from the request body. The RLS insert policy is
 * the backstop; this check is so a non-party gets a clean 404 instead of a
 * policy violation.
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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { claim_id, reason } = await request.json()
  if (!claim_id) return NextResponse.json({ error: 'claim_id is required' }, { status: 400 })

  // A reason is optional — having nowhere to go is worse than a bare report.
  const trimmed = typeof reason === 'string' ? reason.trim() : ''
  if (trimmed.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      { error: `Please keep it to ${MAX_REASON_LENGTH} characters or fewer` },
      { status: 400 }
    )
  }

  const claim = await loadClaimForUser(supabase, claim_id, user.id)
  if (!claim) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const { error } = await supabase
    .from('message_reports')
    .insert({
      claim_id,
      reporter_id: user.id,
      reason: trimmed || null,
    })

  if (error) {
    // 23505 = unique violation on (reporter_id, claim_id): already reported.
    // Treat it as success so the user is not told their report "failed" when
    // it is in fact already with us.
    if (error.code === '23505') {
      return NextResponse.json({ success: true, alreadyReported: true })
    }
    console.error('[messages/report] insert failed', error)
    return NextResponse.json(
      { error: 'Could not submit your report. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

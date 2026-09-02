import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { attended } = await request.json()
  if (typeof attended !== 'boolean') {
    return NextResponse.json({ error: 'attended must be true or false' }, { status: 400 })
  }

  const { data: claim } = await supabase
    .from('claims')
    .select('*, listing:listings(class_datetime, duration_minutes)')
    .eq('id', id)
    .eq('claimer_id', user.id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  if (claim.status !== 'pending_confirmation' && claim.status !== 'claimed') {
    return NextResponse.json({ error: 'Check-in not available for this claim' }, { status: 409 })
  }

  // Verify class has actually ended
  const listing = claim.listing as { class_datetime: string; duration_minutes: number | null }
  const classEnd = new Date(
    new Date(listing.class_datetime).getTime() +
    (listing.duration_minutes ?? 60) * 60 * 1000
  )
  if (new Date() < classEnd) {
    return NextResponse.json({ error: 'Class has not ended yet' }, { status: 409 })
  }

  const serviceSupabase = createServiceClient()

  const { data: updated, error: updateError } = await serviceSupabase
    .from('claims')
    .update({
      checkin_response: attended,
      checkin_responded_at: new Date().toISOString(),
      // Attended → completed (seller payout); no-show → disputed (admin reviews)
      status: attended ? 'completed' : 'disputed',
      disputed_at: attended ? null : new Date().toISOString(),
      dispute_reason: attended ? null : 'Buyer reported no-show via check-in',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, checkin_responded_at')

  if (updateError) {
    console.error('[checkin] update failed', updateError)
    return NextResponse.json({ error: `Check-in failed: ${updateError.message}` }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    console.error('[checkin] update matched no rows', { id })
    return NextResponse.json({ error: 'Check-in did not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, attended, claim: updated[0] })
}

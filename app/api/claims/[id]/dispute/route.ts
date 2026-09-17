import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendDisputeFiledEmail, SELLER_RESPONSE_HOURS } from '@/lib/resend/client'
import { getDisputeWindow, DISPUTE_WINDOW_HOURS } from '@/lib/disputeWindow'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reason, notes, evidence_urls } = await request.json()
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })

  // Either side of the deal can raise a problem.
  const { data: claim } = await supabase
    .from('claims')
    .select('*, listing:listings(class_name, studio_name, class_datetime, duration_minutes)')
    .eq('id', id)
    .or(`claimer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  if (claim.status !== 'pending_confirmation' && claim.status !== 'claimed') {
    return NextResponse.json({ error: 'This claim cannot be disputed at this stage' }, { status: 409 })
  }

  const filedBy: 'buyer' | 'seller' = claim.claimer_id === user.id ? 'buyer' : 'seller'

  // The window opens with the booking confirmation and closes
  // DISPUTE_WINDOW_HOURS after the class ends.
  const window = getDisputeWindow(claim.listing ?? { class_datetime: new Date().toISOString() })
  if (!window.isOpen) {
    return NextResponse.json(
      {
        error: window.hasClosed
          ? `The ${DISPUTE_WINDOW_HOURS} hour window to report a problem has closed.`
          : 'You can report a problem once the booking confirmation is released, 2 hours before class.',
      },
      { status: 409 }
    )
  }

  const serviceSupabase = createServiceClient()

  const now = new Date()
  const responseDeadline = new Date(now.getTime() + SELLER_RESPONSE_HOURS * 60 * 60 * 1000)

  const { data: updated, error: updateError } = await serviceSupabase
    .from('claims')
    .update({
      status: 'disputed',
      disputed_at: now.toISOString(),
      dispute_reason: reason.trim(),
      disputed_by: filedBy,
      dispute_notes: notes?.trim() || null,
      dispute_evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
      seller_response_deadline: responseDeadline.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', id)
    .select('id')

  if (updateError) {
    console.error('[dispute] update failed', updateError)
    return NextResponse.json({ error: `Could not file dispute: ${updateError.message}` }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Dispute did not save. Please try again.' }, { status: 500 })
  }

  // Notify whichever side didn't file
  const otherPartyId = filedBy === 'buyer' ? claim.seller_id : claim.claimer_id
  const { data: other } = await serviceSupabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', otherPartyId)
    .single()

  if (process.env.RESEND_API_KEY && other?.email) {
    sendDisputeFiledEmail({
      sellerEmail: other.email,
      sellerName: other.full_name,
      className: claim.listing?.class_name ?? 'your class',
      studioName: claim.listing?.studio_name ?? '',
      reason: reason.trim(),
      notes: notes?.trim() || null,
      deadline: responseDeadline,
      claimId: id,
    }).catch(console.error)
  }

  // Listing stays 'claimed' — funds remain in escrow until an admin rules on the
  // dispute, so it must not reappear in browse.

  return NextResponse.json({ success: true })
}

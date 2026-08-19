import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendDisputeFiledEmail, SELLER_RESPONSE_HOURS } from '@/lib/resend/client'

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

  const { data: claim } = await supabase
    .from('claims')
    .select('*, listing:listings(class_name, studio_name, class_datetime)')
    .eq('id', id)
    .eq('claimer_id', user.id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  if (claim.status !== 'pending_confirmation' && claim.status !== 'claimed') {
    return NextResponse.json({ error: 'This claim cannot be disputed at this stage' }, { status: 409 })
  }

  const serviceSupabase = createServiceClient()

  const now = new Date()
  const responseDeadline = new Date(now.getTime() + SELLER_RESPONSE_HOURS * 60 * 60 * 1000)

  await serviceSupabase
    .from('claims')
    .update({
      status: 'disputed',
      disputed_at: now.toISOString(),
      dispute_reason: reason.trim(),
      dispute_notes: notes?.trim() || null,
      dispute_evidence_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
      seller_response_deadline: responseDeadline.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', id)

  // Notify the seller that they have a limited window to respond
  const { data: seller } = await serviceSupabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', claim.seller_id)
    .single()

  if (process.env.RESEND_API_KEY && seller?.email) {
    sendDisputeFiledEmail({
      sellerEmail: seller.email,
      sellerName: seller.full_name,
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

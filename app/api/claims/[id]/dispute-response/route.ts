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

  const { response, evidence_urls } = await request.json()
  if (!response?.trim()) {
    return NextResponse.json({ error: 'Please describe your side of the story' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: claim } = await service
    .from('claims')
    .select('*')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  if (claim.status !== 'disputed') {
    return NextResponse.json({ error: 'This dispute is no longer open' }, { status: 409 })
  }
  if (claim.seller_responded_at) {
    return NextResponse.json({ error: 'You have already responded to this dispute' }, { status: 409 })
  }
  if (claim.seller_response_deadline && new Date() > new Date(claim.seller_response_deadline)) {
    return NextResponse.json({ error: 'The 24 hour response window has closed' }, { status: 409 })
  }

  const { data: updated, error: updateError } = await service.from('claims').update({
    seller_response: response.trim(),
    seller_response_urls: Array.isArray(evidence_urls) ? evidence_urls : [],
    seller_responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id')

  if (updateError) {
    console.error('[dispute-response] update failed', updateError)
    return NextResponse.json({ error: `Could not save response: ${updateError.message}` }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Response did not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

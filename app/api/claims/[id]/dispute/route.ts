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

  const { reason } = await request.json()
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })

  const { data: claim } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .eq('claimer_id', user.id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  if (claim.status !== 'pending_confirmation') {
    return NextResponse.json({ error: 'This claim cannot be disputed at this stage' }, { status: 409 })
  }

  const serviceSupabase = createServiceClient()

  await serviceSupabase
    .from('claims')
    .update({
      status: 'disputed',
      disputed_at: new Date().toISOString(),
      dispute_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Listing stays 'claimed' — funds remain in escrow until an admin rules on the
  // dispute, so it must not reappear in browse.

  return NextResponse.json({ success: true })
}

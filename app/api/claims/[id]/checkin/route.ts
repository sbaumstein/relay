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

  if (claim.status !== 'pending_confirmation') {
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

  const serviceSupabase = await createServiceClient()

  await serviceSupabase
    .from('claims')
    .update({
      checkin_response: attended,
      checkin_responded_at: new Date().toISOString(),
      // No-show → hold for review; attended → stays pending_confirmation for auto-release
      status: attended ? 'pending_confirmation' : 'needs_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ success: true, attended })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

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

  // Must dispute before class time
  const listing = await supabase
    .from('listings')
    .select('class_datetime')
    .eq('id', claim.listing_id)
    .single()

  const classTime = new Date(listing.data?.class_datetime ?? 0)
  if (new Date() > classTime) {
    return NextResponse.json(
      { error: 'Disputes must be filed before the class starts' },
      { status: 409 }
    )
  }

  const serviceSupabase = await createServiceClient()

  await serviceSupabase
    .from('claims')
    .update({
      status: 'disputed',
      disputed_at: new Date().toISOString(),
      dispute_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Refund via Stripe if payment was made
  if (claim.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    await stripe.refunds.create({
      payment_intent: claim.stripe_payment_intent_id,
      reason: 'fraudulent',
    }).catch(console.error)
  }

  // Reopen listing so someone else can claim it
  await serviceSupabase
    .from('listings')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', claim.listing_id)

  return NextResponse.json({ success: true })
}

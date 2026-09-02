import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

const ADMIN_EMAIL = 'sambaumstein@gmail.com'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { favor_of } = await request.json()
  if (favor_of !== 'buyer' && favor_of !== 'seller') {
    return NextResponse.json({ error: 'favor_of must be buyer or seller' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: claim } = await service
    .from('claims')
    .select('*')
    .eq('id', id)
    .eq('status', 'disputed')
    .single()

  if (!claim) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  if (favor_of === 'buyer') {
    if (claim.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
      await stripe.refunds.create({
        payment_intent: claim.stripe_payment_intent_id,
      }).catch(console.error)
    }

    const { data: updated, error: updateError } = await service.from('claims').update({
      status: 'dispute_won',
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id')

    if (updateError || !updated?.length) {
      console.error('[decide] dispute_won update failed', updateError)
      return NextResponse.json(
        { error: `Could not record decision: ${updateError?.message ?? 'no rows updated'}` },
        { status: 500 }
      )
    }

    // Reopen listing so someone else can claim it
    await service.from('listings').update({
      status: 'available',
      updated_at: new Date().toISOString(),
    }).eq('id', claim.listing_id)

  } else {
    // Release escrow to seller — Stripe Transfer would go here when Stripe is active
    const { data: updated, error: updateError } = await service.from('claims').update({
      status: 'dispute_lost',
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id')

    if (updateError || !updated?.length) {
      console.error('[decide] dispute_lost update failed', updateError)
      return NextResponse.json(
        { error: `Could not record decision: ${updateError?.message ?? 'no rows updated'}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true })
}

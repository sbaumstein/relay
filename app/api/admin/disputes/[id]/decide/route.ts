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

  const service = await createServiceClient()

  const { data: claim } = await service
    .from('claims')
    .select('*')
    .eq('id', id)
    .eq('status', 'disputed')
    .single()

  if (!claim) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })

  if (favor_of === 'buyer') {
    // Refund buyer — Stripe refund if applicable
    if (claim.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
      await stripe.refunds.create({
        payment_intent: claim.stripe_payment_intent_id,
      }).catch(console.error)
    }

    await service.from('claims').update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // Reopen listing so someone else can claim it
    await service.from('listings').update({
      status: 'available',
      updated_at: new Date().toISOString(),
    }).eq('id', claim.listing_id)

  } else {
    // Release escrow to seller
    if (claim.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
      // In a real integration you'd initiate a Stripe Transfer here
      // For now just mark it completed — payout handled manually or via webhook
    }

    await service.from('claims').update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  }

  return NextResponse.json({ success: true })
}

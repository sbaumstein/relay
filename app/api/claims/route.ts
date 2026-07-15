import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { sendClaimEmails } from '@/lib/resend/client'
import { getSellerStats } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please verify your email before claiming a spot' }, { status: 403 })
  }

  const { listing_id } = await request.json()
  if (!listing_id) return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*, seller:profiles!seller_id(id, email, full_name), studio:studios(*)')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.status !== 'available') return NextResponse.json({ error: 'This listing is no longer available' }, { status: 409 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'You cannot claim your own listing' }, { status: 400 })

  // Determine the cancellation fee that goes to seller on no-show
  const studio = listing.studio
  const cancellationFeeCents = studio
    ? studio.cancellation_policy === 'fixed_fee'
      ? (studio.cancellation_fee_cents ?? 0)
      : listing.price_cents // full_class = buyer loses everything
    : 0

  // Compute seller star rating to determine hold time
  const { data: sellerClaims } = await supabase
    .from('claims')
    .select('status')
    .eq('seller_id', listing.seller_id)

  const sellerTotal = sellerClaims?.length ?? 0
  const sellerCompleted = sellerClaims?.filter(
    (c) => c.status === 'completed' || c.status === 'auto_released'
  ).length ?? 0
  const { holdHours } = getSellerStats(sellerTotal, sellerCompleted)

  // Escrow expires based on seller's star rating
  const classTime = new Date(listing.class_datetime)
  const expiresAt = new Date(classTime.getTime() + holdHours * 60 * 60 * 1000)

  const serviceSupabase = await createServiceClient()

  // If Stripe is configured, charge the full class price into escrow
  if (process.env.STRIPE_SECRET_KEY) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: listing.price_cents,
      currency: 'usd',
      metadata: {
        listing_id,
        claimer_id: user.id,
        seller_id: listing.seller_id,
      },
      description: `Escrow: ${listing.class_name} at ${listing.studio_name ?? studio?.name}`,
    })

    const { data: claim, error: claimError } = await serviceSupabase
      .from('claims')
      .insert({
        listing_id,
        claimer_id: user.id,
        seller_id: listing.seller_id,
        amount_cents: listing.price_cents,
        platform_fee_cents: 0,
        seller_payout_cents: listing.price_cents,
        cancellation_fee_cents: cancellationFeeCents,
        stripe_payment_intent_id: paymentIntent.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending_payment',
      })
      .select('*')
      .single()

    if (claimError) {
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(console.error)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      claimId: claim.id,
      requiresPayment: true,
    })
  }

  // No Stripe configured — complete immediately (dev/demo mode)
  const { data: claim, error: claimError } = await serviceSupabase
    .from('claims')
    .insert({
      listing_id,
      claimer_id: user.id,
      seller_id: listing.seller_id,
      amount_cents: listing.price_cents,
      platform_fee_cents: 0,
      seller_payout_cents: listing.price_cents,
      cancellation_fee_cents: cancellationFeeCents,
      expires_at: expiresAt.toISOString(),
      status: 'pending_confirmation',
    })
    .select('*')
    .single()

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })

  await serviceSupabase
    .from('listings')
    .update({ status: 'claimed', updated_at: new Date().toISOString() })
    .eq('id', listing_id)

  const { data: claimerProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  if (process.env.RESEND_API_KEY && claimerProfile && listing.seller) {
    sendClaimEmails({
      claimerEmail: claimerProfile.email,
      claimerName: claimerProfile.full_name,
      sellerEmail: listing.seller.email,
      sellerName: listing.seller.full_name,
      listing,
      claim,
    }).catch(console.error)
  }

  return NextResponse.json({ claim, success: true }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendListingPostedEmail } from '@/lib/resend/client'
import type { NewListingFormData, SkillLevel } from '@/types'
import { isBanned, BANNED_MESSAGE } from '@/lib/admin/ban'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please verify your email before posting a listing' }, { status: 403 })
  }
  if (await isBanned(user.id)) {
    return NextResponse.json({ error: BANNED_MESSAGE }, { status: 403 })
  }

  const body: NewListingFormData & {
    confirmation_screenshot_url?: string
    class_datetime?: string
  } = await request.json()

  // Optional last-minute price. Must be a real reduction, or it would silently
  // do nothing (or worse, raise the price) once the discount window opens.
  const discountCents =
    body.discount_price_cents == null ? null : Math.round(Number(body.discount_price_cents))
  if (discountCents != null) {
    if (!Number.isFinite(discountCents) || discountCents < 0) {
      return NextResponse.json({ error: 'Last-minute price is not valid' }, { status: 400 })
    }
    if (discountCents >= body.price_cents) {
      return NextResponse.json(
        { error: 'Last-minute price must be below the full price' },
        { status: 400 }
      )
    }
  }

  // Same-day listings are fine as long as the class has not started yet.
  // Prefer the client's resolved timestamp: parsing date+time here would use
  // the server's timezone (UTC in production), not the poster's.
  const classDt = body.class_datetime
    ? new Date(body.class_datetime)
    : new Date(`${body.class_date}T${body.class_time}`)

  if (Number.isNaN(classDt.getTime())) {
    return NextResponse.json({ error: 'Invalid class date or time' }, { status: 400 })
  }
  if (classDt <= new Date()) {
    return NextResponse.json(
      { error: 'Class must be in the future' },
      { status: 400 }
    )
  }

  // Resolve studio name from studio_id
  let studioName = body.studio_name ?? ''
  if (body.studio_id && !studioName) {
    const { data: studio } = await supabase
      .from('studios')
      .select('name')
      .eq('id', body.studio_id)
      .single()
    studioName = studio?.name ?? ''
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      studio_name: studioName,
      class_name: body.class_name,
      instructor_name: body.instructor_name || null,
      class_type: body.class_type,
      description: body.description || null,
      class_date: body.class_date,
      class_time: body.class_time,
      class_datetime: classDt.toISOString(),
      duration_minutes: body.duration_minutes || null,
      address: body.address,
      neighborhood: body.neighborhood || null,
      price_cents: body.price_cents,
      discount_price_cents: discountCents,
      skill_level: body.skill_level ?? 'all_levels',
      studio_id: body.studio_id || null,
      confirmation_screenshot_url: body.confirmation_screenshot_url || null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email (non-blocking)
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  if (profile && process.env.RESEND_API_KEY) {
    sendListingPostedEmail({
      sellerEmail: profile.email,
      sellerName: profile.full_name,
      listing,
    }).catch(console.error)
  }

  return NextResponse.json({ listing }, { status: 201 })
}

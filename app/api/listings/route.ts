import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendListingPostedEmail } from '@/lib/resend/client'
import type { ClassType, NewListingFormData, SkillLevel } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const classType = searchParams.get('class_type') as ClassType | null
  const isFree = searchParams.get('is_free')
  const neighborhood = searchParams.get('neighborhood')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select('*, seller:profiles!seller_id(id, full_name, email)')
    .eq('status', 'available')
    .gte('class_datetime', new Date().toISOString())
    .order('class_datetime', { ascending: true })
    .range(offset, offset + limit - 1)

  if (classType) query = query.eq('class_type', classType)
  if (isFree === 'true') query = query.eq('is_free', true)
  if (neighborhood) query = query.eq('neighborhood', neighborhood)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ listings: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Please verify your email before posting a listing' }, { status: 403 })
  }

  const body: NewListingFormData & { confirmation_screenshot_url?: string } = await request.json()

  // Validate class is in the future (at least 2 hours)
  const classDt = new Date(`${body.class_date}T${body.class_time}`)
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (classDt <= twoHoursFromNow) {
    return NextResponse.json(
      { error: 'Class must be at least 2 hours in the future' },
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

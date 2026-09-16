import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ClassType, SkillLevel } from '@/types'

/** Fields a seller may change after posting. Studio is excluded: it determines
 *  the cancellation policy a buyer agreed to, so it can't be swapped out. */
interface EditableListing {
  class_name: string
  instructor_name?: string | null
  class_type: ClassType
  skill_level: SkillLevel
  description?: string | null
  class_date: string
  class_time: string
  class_datetime?: string
  duration_minutes?: number | null
  address: string
  neighborhood?: string | null
  price_cents: number
  discount_price_cents?: number | null
}

async function loadOwnedListing(id: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', id)
    .single()

  if (error || !data) return { error: 'Listing not found', status: 404 as const }
  if (data.seller_id !== userId) return { error: 'This is not your listing', status: 403 as const }
  return { listing: data }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await loadOwnedListing(id, user.id)
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

  // Once someone has claimed it, the details are part of a deal in progress.
  if (owned.listing.status !== 'available') {
    return NextResponse.json(
      { error: 'This listing can no longer be edited — it has been claimed or is no longer active' },
      { status: 409 }
    )
  }

  const body: Partial<EditableListing> = await request.json()

  const classDt = body.class_datetime
    ? new Date(body.class_datetime)
    : body.class_date && body.class_time
      ? new Date(`${body.class_date}T${body.class_time}`)
      : null

  if (!classDt || Number.isNaN(classDt.getTime())) {
    return NextResponse.json({ error: 'Invalid class date or time' }, { status: 400 })
  }
  if (classDt <= new Date()) {
    return NextResponse.json({ error: 'Class must be in the future' }, { status: 400 })
  }

  const priceCents = Math.round(Number(body.price_cents))
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return NextResponse.json({ error: 'Price is not valid' }, { status: 400 })
  }

  const discountCents =
    body.discount_price_cents == null ? null : Math.round(Number(body.discount_price_cents))
  if (discountCents != null) {
    if (!Number.isFinite(discountCents) || discountCents < 0) {
      return NextResponse.json({ error: 'Last-minute price is not valid' }, { status: 400 })
    }
    if (discountCents >= priceCents) {
      return NextResponse.json(
        { error: 'Last-minute price must be below the full price' },
        { status: 400 }
      )
    }
  }

  const service = createServiceClient()
  const { data: updated, error } = await service
    .from('listings')
    .update({
      class_name: body.class_name,
      instructor_name: body.instructor_name || null,
      class_type: body.class_type,
      skill_level: body.skill_level ?? 'all_levels',
      description: body.description || null,
      class_date: body.class_date,
      class_time: body.class_time,
      class_datetime: classDt.toISOString(),
      duration_minutes: body.duration_minutes || null,
      address: body.address,
      neighborhood: body.neighborhood || null,
      price_cents: priceCents,
      discount_price_cents: discountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'available')
    .select('id')

  if (error) {
    console.error('[listings PATCH] update failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Update did not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const owned = await loadOwnedListing(id, user.id)
  if ('error' in owned) return NextResponse.json({ error: owned.error }, { status: owned.status })

  const service = createServiceClient()

  // A claimed listing has someone's money against it; cancelling it here would
  // strand that claim outside the dispute flow.
  const { data: activeClaims } = await service
    .from('claims')
    .select('id')
    .eq('listing_id', id)
    .in('status', ['pending_payment', 'pending_confirmation', 'claimed', 'disputed'])

  if (activeClaims && activeClaims.length > 0) {
    return NextResponse.json(
      { error: 'Someone has already claimed this spot. Resolve the claim before removing it.' },
      { status: 409 }
    )
  }

  // Cancel rather than hard-delete so the row survives for history; the
  // dashboard and browse both filter cancelled listings out.
  const { data: cancelled, error } = await service
    .from('listings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[listings DELETE] cancel failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!cancelled || cancelled.length === 0) {
    return NextResponse.json({ error: 'Could not remove the listing. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

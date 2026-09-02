import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: claim } = await supabase
    .from('claims')
    .select('*')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  if (claim.status !== 'pending_confirmation') {
    return NextResponse.json({ error: 'Cannot confirm at this stage' }, { status: 409 })
  }

  const service = createServiceClient()
  const { data: updated, error: updateError } = await service.from('claims').update({
    status: 'claimed',
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id')

  if (updateError) {
    console.error('[confirm] update failed', updateError)
    return NextResponse.json({ error: `Could not confirm: ${updateError.message}` }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Confirmation did not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

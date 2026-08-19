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
  await service.from('claims').update({
    status: 'claimed',
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}

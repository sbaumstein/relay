import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser, ADMIN_EMAIL } from '@/lib/admin/auth'

type Action = 'ban' | 'unban' | 'set_boost' | 'set_notes'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const action = body.action as Action

  const service = createServiceClient()

  // Select only columns guaranteed by the base schema. Selecting a column that
  // doesn't exist yet (e.g. before the admin migration is applied) makes the
  // whole query error, which previously surfaced as a misleading "User not found".
  const { data: target, error: lookupError } = await service
    .from('profiles')
    .select('id, email')
    .eq('id', id)
    .single()

  if (lookupError) {
    console.error('[admin/users] lookup failed', lookupError)
    return NextResponse.json(
      { error: `Could not load user: ${lookupError.message}` },
      { status: 500 }
    )
  }
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.email === ADMIN_EMAIL && (action === 'ban' || action === 'set_boost')) {
    return NextResponse.json({ error: 'You cannot moderate the admin account' }, { status: 400 })
  }

  let patch: Record<string, unknown>

  switch (action) {
    case 'ban':
      patch = {
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null,
      }
      break
    case 'unban':
      patch = { is_banned: false, banned_at: null, ban_reason: null }
      break
    case 'set_boost': {
      const boost = Number(body.boost)
      if (!Number.isInteger(boost) || boost < -5 || boost > 5) {
        return NextResponse.json({ error: 'Boost must be a whole number between -5 and 5' }, { status: 400 })
      }
      patch = { credibility_boost: boost }
      break
    }
    case 'set_notes':
      patch = { admin_notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null }
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const { data: updated, error } = await service
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, is_banned, credibility_boost, ban_reason, admin_notes')

  if (error) {
    console.error('[admin/users] update failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Update did not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile: updated[0] })
}

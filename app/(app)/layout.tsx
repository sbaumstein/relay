import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'
import { loadMyClaims } from './messages/conversations'
import type { Profile } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Unread messages across every claim the user is party to.
 *
 * This layout wraps every signed-in page, so the badge must never be able to
 * take the shell down: anything that goes wrong (absent messages table, RLS,
 * network) degrades to 0.
 */
async function countUnread(
  supabase: SupabaseServerClient,
  userId: string
): Promise<number> {
  try {
    const claims = await loadMyClaims(supabase, userId)
    const claimIds = claims.map((c) => c.id)
    if (claimIds.length === 0) return 0

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('claim_id', claimIds)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  let unreadCount = 0
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
    unreadCount = await countUnread(supabase, user.id)
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* pb clears the fixed bar plus the phone's home-indicator inset. */}
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
      <BottomNav user={profile} unreadCount={unreadCount} />
    </div>
  )
}

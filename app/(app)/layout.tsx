import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
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
      <BottomNav user={profile} />
    </div>
  )
}

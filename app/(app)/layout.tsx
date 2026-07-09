import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
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
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

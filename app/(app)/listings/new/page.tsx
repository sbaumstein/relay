import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewListingForm } from '@/components/listings/NewListingForm'
import type { Profile } from '@/types'

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/listings/new')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Post a Class Spot</h1>
        <p className="text-muted-foreground mt-1">
          List your workout class so someone else can claim it
        </p>
      </div>
      <NewListingForm profile={profile as Profile} />
    </div>
  )
}

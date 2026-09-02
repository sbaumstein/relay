import { createClient } from '@/lib/supabase/server'

export const ADMIN_EMAIL = 'sambaumstein@gmail.com'

/** Returns the signed-in admin user, or null if the caller is not the admin. */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

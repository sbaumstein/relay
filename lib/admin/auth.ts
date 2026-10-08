import { createClient } from '@/lib/supabase/server'

/** Everyone with full admin access. Compared case-insensitively. */
export const ADMIN_EMAILS = [
  'sambaumstein@gmail.com',
  'relayxapp@gmail.com',
  'maxberman23@gmail.com',
] as const

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.some((a) => a === normalized)
}

/** Returns the signed-in admin user, or null if the caller is not an admin. */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return null
  return user
}

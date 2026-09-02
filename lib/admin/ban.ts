import { createServiceClient } from '@/lib/supabase/server'

/**
 * True when the user has been banned by an admin. Uses the service client so
 * the check can't be defeated by row-level security on the caller's session.
 */
export async function isBanned(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('is_banned')
    .eq('id', userId)
    .single()
  return data?.is_banned === true
}

export const BANNED_MESSAGE =
  'Your account has been suspended. Contact support if you think this is a mistake.'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazily marks any 'available' listings whose class_datetime has passed as 'expired'.
 * Call at the top of server pages that display listings so the status stays accurate.
 */
export async function expireStaleListings(supabase: SupabaseClient, sellerIdFilter?: string) {
  let query = supabase
    .from('listings')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'available')
    .lt('class_datetime', new Date().toISOString())

  if (sellerIdFilter) query = query.eq('seller_id', sellerIdFilter)

  await query
}

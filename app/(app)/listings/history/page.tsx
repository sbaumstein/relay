import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_HOLD_HOURS } from '@/lib/autoRelease'
import { PastRow } from '@/components/dashboard/PastRow'
import { HistoryPageLayout } from '@/components/dashboard/HistorySection'
import type { Listing } from '@/types'

export default async function ListingsHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/listings/history')

  // Once escrow has released there is nothing left to act on, so a listing
  // counts as settled from the same point the profile drops it.
  const holdCutoff = new Date(Date.now() - DEFAULT_HOLD_HOURS * 60 * 60 * 1000).toISOString()

  const { data: pastListings } = await supabase.from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .or(`status.in.(expired,cancelled),class_datetime.lte.${holdCutoff}`)
    .order('class_datetime', { ascending: false })

  const rows = pastListings ?? []

  return (
    <HistoryPageLayout title="Previous listings" count={rows.length}>
      {rows.map((listing) => {
        const l = listing as Listing
        return (
          <PastRow
            key={l.id}
            classDatetime={l.class_datetime}
            title={l.class_name}
            subtitle={l.studio_name}
            status={l.status}
            amountCents={l.price_cents}
          />
        )
      })}
    </HistoryPageLayout>
  )
}

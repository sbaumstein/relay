import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PastRow } from '@/components/dashboard/PastRow'
import { HistoryPageLayout } from '@/components/dashboard/HistorySection'

export default async function ClaimsHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/claims/history')

  const { data: pastClaims } = await supabase.from('claims')
    .select('*, listing:listings(*)')
    .eq('claimer_id', user.id)
    .in('status', ['completed', 'auto_released', 'refunded', 'dispute_won', 'dispute_lost'])
    .order('created_at', { ascending: false })

  const rows = pastClaims ?? []

  return (
    <HistoryPageLayout title="Previous claims" count={rows.length}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((c: any) => (
        <PastRow
          key={c.id}
          classDatetime={c.listing?.class_datetime ?? c.created_at}
          title={c.listing?.class_name ?? 'Class'}
          subtitle={c.listing?.studio_name ?? ''}
          status={c.status}
          amountCents={c.amount_cents}
        />
      ))}
    </HistoryPageLayout>
  )
}

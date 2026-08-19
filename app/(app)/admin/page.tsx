export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/stripe/helpers'
import { getSellerStats } from '@/types'
import { DisputeDecisionPanel } from '@/components/admin/DisputeDecisionPanel'

const ADMIN_EMAIL = 'sambaumstein@gmail.com'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/browse')

  const service = await createServiceClient()

  const [
    { data: profiles },
    { data: allClaims },
    { data: disputes },
  ] = await Promise.all([
    service.from('profiles').select('*').order('created_at', { ascending: false }),
    service.from('claims').select('*, listing:listings(class_name, studio_name, class_datetime, price_cents)').order('created_at', { ascending: false }),
    service.from('claims')
      .select('*, listing:listings(class_name, studio_name, class_datetime, price_cents, address), claimer:profiles!claimer_id(email, full_name), seller:profiles!seller_id(email, full_name)')
      .eq('status', 'disputed')
      .order('disputed_at', { ascending: true }),
  ])

  // Escrow summary — claims where money is actively held
  const escrowStatuses = ['pending_payment', 'pending_confirmation', 'disputed']
  const escrowClaims = (allClaims ?? []).filter(c => escrowStatuses.includes(c.status))
  const totalEscrow = escrowClaims.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)
  const pendingTransfer = (allClaims ?? [])
    .filter(c => c.status === 'pending_confirmation')
    .reduce((sum, c) => sum + (c.seller_payout_cents ?? 0), 0)

  // Build per-user stats
  const claimsArr = allClaims ?? []
  const userStats = (profiles ?? []).map(p => {
    const asSellerAll = claimsArr.filter(c => c.seller_id === p.id)
    const asSellerCompleted = asSellerAll.filter(c => c.status === 'completed' || c.status === 'auto_released').length
    const stats = getSellerStats(asSellerAll.length, asSellerCompleted)

    const asBuyer = claimsArr.filter(c => c.claimer_id === p.id)
    const buyerCompleted = asBuyer.filter(c => c.status === 'completed' || c.status === 'auto_released').length
    const buyerDisputed = asBuyer.filter(c => c.status === 'disputed').length

    return { profile: p, stats, asBuyer: asBuyer.length, buyerCompleted, buyerDisputed }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-3xl font-bold text-white">Control Panel</h1>
      </div>

      {/* Escrow summary */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">Escrow</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-white/20 p-5">
            <p className="text-xs text-white/50 mb-1">Total in escrow</p>
            <p className="text-2xl font-bold text-white">{formatCents(totalEscrow)}</p>
            <p className="text-xs text-white/40 mt-1">{escrowClaims.length} active claim{escrowClaims.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="border border-white/20 p-5">
            <p className="text-xs text-white/50 mb-1">Pending seller transfers</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCents(pendingTransfer)}</p>
            <p className="text-xs text-white/40 mt-1">releases after confirmation</p>
          </div>
          <div className="border border-white/20 p-5">
            <p className="text-xs text-white/50 mb-1">In dispute</p>
            <p className="text-2xl font-bold text-orange-400">
              {formatCents(escrowClaims.filter(c => c.status === 'disputed').reduce((s, c) => s + c.amount_cents, 0))}
            </p>
            <p className="text-xs text-white/40 mt-1">{(disputes ?? []).length} open dispute{(disputes ?? []).length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </section>

      {/* Disputes */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">
          Open disputes ({(disputes ?? []).length})
        </p>
        {!disputes || disputes.length === 0 ? (
          <p className="text-white/40 text-sm py-8 border-t border-white/20 text-center">No open disputes</p>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <DisputeDecisionPanel key={d.id} dispute={d} />
            ))}
          </div>
        )}
      </section>

      {/* Users */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">
          Users ({userStats.length})
        </p>
        <div className="border-t border-white/20">
          {userStats.map(({ profile: p, stats, asBuyer, buyerCompleted, buyerDisputed }) => (
            <div key={p.id} className="flex items-start gap-6 py-4 px-1 border-b border-white/20 text-sm">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{p.full_name ?? '—'}</p>
                <p className="text-white/50 text-xs">{p.email}</p>
                <p className="text-white/30 text-xs mt-0.5">joined {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-center w-28">
                <p className="text-white/50 text-xs mb-1">Seller</p>
                <p className="text-white font-semibold">{stats.stars > 0 ? `${'★'.repeat(stats.stars)}${'☆'.repeat(5 - stats.stars)}` : 'New'}</p>
                <p className="text-white/40 text-xs">{stats.total} sales · {stats.rate}%</p>
                <p className="text-white/30 text-xs">{stats.holdHours}hr hold</p>
              </div>
              <div className="text-center w-28">
                <p className="text-white/50 text-xs mb-1">Buyer</p>
                <p className="text-white font-semibold">{asBuyer} claims</p>
                <p className="text-white/40 text-xs">{buyerCompleted} completed</p>
                {buyerDisputed > 0 && (
                  <p className="text-orange-400 text-xs">{buyerDisputed} disputed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

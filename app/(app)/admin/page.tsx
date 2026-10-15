export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/stripe/helpers'
import { getSellerStats } from '@/types'
import { AdminDisputeList } from '@/components/admin/AdminDisputeList'
import { AdminUserTable, type AdminUserRow } from '@/components/admin/AdminUserTable'
import { AdminMessageReports, type AdminReportRow } from '@/components/admin/AdminMessageReports'
import { getAdminUser } from '@/lib/admin/auth'
import { releaseMaturedClaims } from '@/lib/autoRelease'

export default async function AdminPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/browse')

  // Settle matured escrow first so the totals below reflect reality.
  await releaseMaturedClaims()

  const service = createServiceClient()

  const [
    { data: profiles },
    { data: allClaims },
    { data: rawDisputes },
    { data: rawReports, error: reportsError },
  ] = await Promise.all([
    service.from('profiles').select('*').order('created_at', { ascending: false }),
    service.from('claims').select('*, listing:listings(class_name, studio_name, class_datetime, price_cents)').order('created_at', { ascending: false }),
    service.from('claims')
      .select('*, listing:listings(class_name, studio_name, class_datetime, price_cents, address)')
      .in('status', ['disputed', 'needs_review'])
      .order('disputed_at', { ascending: true }),
    // message_reports may not exist yet (migration applied by hand), so this
    // is read with its error kept rather than destructured away — the section
    // below degrades to a notice instead of throwing the whole page.
    service.from('message_reports')
      .select('id, claim_id, reporter_id, reason, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
  ])

  // Hydrate claimer/seller onto disputes from the profiles we already fetched
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const disputes = (rawDisputes ?? []).map(d => ({
    ...d,
    claimer: profileMap[d.claimer_id] ?? null,
    seller: profileMap[d.seller_id] ?? null,
  }))

  // Open abuse reports, hydrated with the thread's two parties and the class
  // they were transacting on. Reads nothing the admin panel doesn't already
  // show elsewhere; the messages themselves are loaded on demand, per report.
  const claimById = Object.fromEntries((allClaims ?? []).map(c => [c.id, c]))
  const reportsUnavailable = !!reportsError
  const reports: AdminReportRow[] = (rawReports ?? []).map(r => {
    const claim = claimById[r.claim_id]
    const otherId = claim
      ? (claim.claimer_id === r.reporter_id ? claim.seller_id : claim.claimer_id)
      : null
    const reporter = profileMap[r.reporter_id] ?? null
    const other = otherId ? profileMap[otherId] ?? null : null
    return {
      id: r.id,
      claim_id: r.claim_id,
      reason: r.reason ?? null,
      status: r.status,
      created_at: r.created_at,
      reporterName: reporter?.full_name ?? null,
      reporterEmail: reporter?.email ?? null,
      counterpartyName: other?.full_name ?? null,
      counterpartyEmail: other?.email ?? null,
      className: claim?.listing?.class_name ?? null,
      studioName: claim?.listing?.studio_name ?? null,
    }
  })

  // Escrow summary — claims where money is actively held
  const escrowStatuses = ['pending_payment', 'pending_confirmation', 'disputed']
  const escrowClaims = (allClaims ?? []).filter(c => escrowStatuses.includes(c.status))
  const totalEscrow = escrowClaims.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)
  const pendingTransfer = (allClaims ?? [])
    .filter(c => c.status === 'pending_confirmation')
    .reduce((sum, c) => sum + (c.seller_payout_cents ?? 0), 0)

  // Build per-user stats
  const claimsArr = allClaims ?? []
  const userRows: AdminUserRow[] = (profiles ?? []).map(p => {
    const asSellerAll = claimsArr.filter(c => c.seller_id === p.id)
    const asSellerCompleted = asSellerAll.filter(c => c.status === 'completed' || c.status === 'auto_released').length
    const boost = p.credibility_boost ?? 0
    const base = getSellerStats(asSellerAll.length, asSellerCompleted)
    const stats = getSellerStats(asSellerAll.length, asSellerCompleted, boost)

    const asBuyer = claimsArr.filter(c => c.claimer_id === p.id)
    const buyerCompleted = asBuyer.filter(c => c.status === 'completed' || c.status === 'auto_released').length
    const buyerDisputed = asBuyer.filter(c => c.status === 'disputed').length

    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      is_banned: p.is_banned ?? false,
      ban_reason: p.ban_reason ?? null,
      credibility_boost: boost,
      admin_notes: p.admin_notes ?? null,
      stars: stats.stars,
      baseStars: base.stars,
      rate: stats.rate,
      sellerTotal: asSellerAll.length,
      buyerTotal: asBuyer.length,
      buyerCompleted,
      buyerDisputed,
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-3xl font-bold text-white">Control Panel</h1>
      </div>

      {/* Held funds summary */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">Held funds</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-white/20 rounded-xl p-5">
            <p className="text-xs text-white/50 mb-1">Total held</p>
            <p className="text-2xl font-bold text-white">{formatCents(totalEscrow)}</p>
            <p className="text-xs text-white/40 mt-1">{escrowClaims.length} active claim{escrowClaims.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="border border-white/20 rounded-xl p-5">
            <p className="text-xs text-white/50 mb-1">Pending seller transfers</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCents(pendingTransfer)}</p>
            <p className="text-xs text-white/40 mt-1">releases after confirmation</p>
          </div>
          <div className="border border-white/20 rounded-xl p-5">
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
          Open disputes ({disputes.length})
        </p>
        <AdminDisputeList disputes={disputes} />
      </section>

      {/* Reported conversations */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">
          Reported conversations{reportsUnavailable ? '' : ` (${reports.length})`}
        </p>
        <AdminMessageReports reports={reports} unavailable={reportsUnavailable} />
      </section>

      {/* Users */}
      <section>
        <p className="text-xs text-white/50 uppercase tracking-widest mb-4">
          Users ({userRows.length})
        </p>
        <AdminUserTable users={userRows} />
      </section>
    </div>
  )
}

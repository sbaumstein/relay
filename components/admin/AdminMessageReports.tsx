'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { timestampLabel } from '@/lib/datetime'
import { AdminClaimThread } from './AdminClaimThread'
import { setReportStatus, type ReportStatus } from './actions'

export type AdminReportRow = {
  id: string
  claim_id: string
  reason: string | null
  status: string
  created_at: string
  reporterName: string | null
  reporterEmail: string | null
  /** Who the reporter was talking to, for context. */
  counterpartyName: string | null
  counterpartyEmail: string | null
  className: string | null
  studioName: string | null
}

export function AdminMessageReports({
  reports,
  unavailable = false,
}: {
  reports: AdminReportRow[]
  /** True when the message_reports table isn't there yet. */
  unavailable?: boolean
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  const update = async (id: string, status: ReportStatus) => {
    setBusy(id)
    const result = await setReportStatus(id, status)
    setBusy(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(status === 'open' ? 'Reopened' : `Marked ${status}`)
    router.refresh()
  }

  if (unavailable) {
    return (
      <p className="text-white/40 text-sm py-8 border border-white/20 rounded-xl text-center">
        Reports aren&apos;t set up in this environment yet — run
        supabase-message-reports-migration.sql.
      </p>
    )
  }

  if (reports.length === 0) {
    return (
      <p className="text-white/40 text-sm py-8 border-t border-white/20 text-center">
        No open reports
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((r) => (
        <div key={r.id} className="border border-red-400/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-red-400 uppercase tracking-widest mb-1">
                Reported conversation
              </p>
              <p className="text-white font-semibold">{r.className ?? '—'}</p>
              <p className="text-white/50 text-xs">{r.studioName ?? ''}</p>
            </div>
            <p className="text-white/40 text-xs flex-shrink-0">
              {timestampLabel(r.created_at)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-white/5 p-3">
              <p className="text-white/40 uppercase tracking-widest mb-1">Reported by</p>
              <p className="text-white">{r.reporterName ?? '—'}</p>
              <p className="text-white/50">{r.reporterEmail ?? ''}</p>
            </div>
            <div className="bg-white/5 p-3">
              <p className="text-white/40 uppercase tracking-widest mb-1">Other party</p>
              <p className="text-white">{r.counterpartyName ?? '—'}</p>
              <p className="text-white/50">{r.counterpartyEmail ?? ''}</p>
            </div>
          </div>

          <div className="bg-white/5 p-3 text-sm">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
              Reporter&apos;s reason
            </p>
            <p className="text-white/80 whitespace-pre-wrap">
              {r.reason ?? 'No reason given'}
            </p>
          </div>

          <AdminClaimThread
            claimId={r.claim_id}
            buyerName={null}
            sellerName={null}
          />

          <div className="flex gap-3">
            <button
              onClick={() => void update(r.id, 'resolved')}
              disabled={busy === r.id}
              className="flex-1 py-2.5 text-sm font-medium border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
            >
              {busy === r.id ? 'Saving…' : 'Mark handled'}
            </button>
            <button
              onClick={() => void update(r.id, 'dismissed')}
              disabled={busy === r.id}
              className="flex-1 py-2.5 text-sm font-medium border border-white/20 text-white/60 hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              {busy === r.id ? 'Saving…' : 'Dismiss'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

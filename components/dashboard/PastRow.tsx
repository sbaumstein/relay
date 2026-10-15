import { formatCents } from '@/lib/stripe/helpers'
import { monthShort, dayOfMonth } from '@/lib/datetime'

export function StatusPill({ status }: { status: string }) {
  // The stored names are historical: pending_confirmation dates from when a
  // seller had to confirm the handover. That step is gone, so it is simply the
  // claimed state now, and pending_payment is the one still settling.
  const styles: Record<string, { color: string; label: string }> = {
    available:            { color: 'text-emerald-400 border-emerald-400/30', label: 'Available' },
    pending_payment:      { color: 'text-yellow-400 border-yellow-400/30',  label: 'Pending' },
    pending_confirmation: { color: 'text-blue-400 border-blue-400/30',      label: 'Claimed' },
    claimed:              { color: 'text-blue-400 border-blue-400/30',      label: 'Claimed' },
    completed:            { color: 'text-emerald-400 border-emerald-400/30',label: 'Completed' },
    auto_released:        { color: 'text-emerald-400 border-emerald-400/30',label: 'Completed' },
    disputed:             { color: 'text-orange-400 border-orange-400/30',  label: 'Under dispute' },
    dispute_won:          { color: 'text-emerald-400 border-emerald-400/30',label: 'Dispute won' },
    dispute_lost:         { color: 'text-red-400 border-red-400/30',        label: 'Dispute lost' },
    needs_review:         { color: 'text-orange-400 border-orange-400/30',  label: 'Under review' },
    expired:              { color: 'text-white/40 border-white/10',         label: 'Expired' },
    cancelled:            { color: 'text-red-400 border-red-400/30',        label: 'Cancelled' },
    refunded:             { color: 'text-white/40 border-white/10',         label: 'Refunded' },
  }
  const s = styles[status] ?? { color: 'text-white/70 border-white/20', label: status.replace(/_/g, ' ') }
  return (
    <span className={`text-xs border px-2 py-0.5 ${s.color}`}>
      {s.label}
    </span>
  )
}

/** Settled listings and claims only need to be legible, not actionable. */
export function PastRow({
  classDatetime, title, subtitle, status, amountCents,
}: {
  classDatetime: string
  title: string
  subtitle: string
  status: string
  amountCents: number
}) {
  const d = new Date(classDatetime)
  return (
    <div className="flex items-center gap-4 py-3 px-1 border-b border-white/10">
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-base font-semibold text-white/80 leading-none">{dayOfMonth(d)}</p>
        <p className="text-xs text-white/50">{monthShort(d)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm truncate">{title}</p>
        <p className="text-xs text-white/50 truncate">{subtitle}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        <StatusPill status={status} />
        <p className="text-white/70 text-sm">{formatCents(amountCents)}</p>
      </div>
    </div>
  )
}

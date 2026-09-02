'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { DisputeDecisionPanel } from './DisputeDecisionPanel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispute = any

export function AdminDisputeList({ disputes }: { disputes: Dispute[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'awaiting' | 'answered' | 'lapsed'>('all')

  const now = Date.now()

  const categorize = (d: Dispute) => {
    if (d.seller_responded_at) return 'answered'
    if (d.seller_response_deadline && new Date(d.seller_response_deadline).getTime() < now) return 'lapsed'
    return 'awaiting'
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return disputes.filter((d) => {
      if (filter !== 'all' && categorize(d) !== filter) return false
      if (!q) return true
      return [
        d.listing?.class_name,
        d.listing?.studio_name,
        d.claimer?.email,
        d.claimer?.full_name,
        d.seller?.email,
        d.seller?.full_name,
        d.dispute_reason,
        d.dispute_notes,
      ].some((f: string | null | undefined) => (f ?? '').toLowerCase().includes(q))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputes, query, filter])

  const counts = {
    all: disputes.length,
    awaiting: disputes.filter((d) => categorize(d) === 'awaiting').length,
    answered: disputes.filter((d) => categorize(d) === 'answered').length,
    lapsed: disputes.filter((d) => categorize(d) === 'lapsed').length,
  }

  const filters = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'answered', label: `Seller replied (${counts.answered})` },
    { key: 'awaiting', label: `Awaiting seller (${counts.awaiting})` },
    { key: 'lapsed', label: `Window closed (${counts.lapsed})` },
  ] as const

  if (disputes.length === 0) {
    return (
      <p className="text-white/40 text-sm py-8 border-t border-white/20 text-center">
        No open disputes
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search disputes by class, studio, person or reason…"
          className="w-full bg-white/5 border border-white/20 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs border px-3 py-1.5 transition-colors ${
              filter === f.key
                ? 'border-white text-white'
                : 'border-white/20 text-white/50 hover:border-white/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center border border-white/20">
          No disputes match
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <DisputeDecisionPanel key={d.id} dispute={d} />
          ))}
        </div>
      )}
    </div>
  )
}

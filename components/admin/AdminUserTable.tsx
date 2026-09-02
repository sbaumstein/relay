'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Ban, ShieldCheck, ChevronDown } from 'lucide-react'

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  created_at: string
  is_banned: boolean
  ban_reason: string | null
  credibility_boost: number
  admin_notes: string | null
  stars: number
  baseStars: number
  rate: number
  holdHours: number
  sellerTotal: number
  buyerTotal: number
  buyerCompleted: number
  buyerDisputed: number
}

export function AdminUserTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'banned' | 'boosted' | 'disputed'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (filter === 'banned' && !u.is_banned) return false
      if (filter === 'boosted' && u.credibility_boost === 0) return false
      if (filter === 'disputed' && u.buyerDisputed === 0) return false
      if (!q) return true
      return (
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [users, query, filter])

  const act = async (id: string, body: Record<string, unknown>, successMsg: string) => {
    setBusy(id)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok) { toast.error(data.error ?? 'Action failed'); return }
    const r = data.revoked
    if (r) {
      const parts = [
        r.listingsCancelled && `${r.listingsCancelled} listing${r.listingsCancelled === 1 ? '' : 's'} removed`,
        (r.refundedAsSeller + r.refundedAsBuyer) &&
          `${r.refundedAsSeller + r.refundedAsBuyer} claim${r.refundedAsSeller + r.refundedAsBuyer === 1 ? '' : 's'} refunded`,
        r.spotsReleased && `${r.spotsReleased} spot${r.spotsReleased === 1 ? '' : 's'} back on browse`,
      ].filter(Boolean)
      toast.success(parts.length ? `${successMsg} — ${parts.join(', ')}` : successMsg)
      if (r.errors?.length) toast.error(r.errors[0])
    } else {
      toast.success(successMsg)
    }
    router.refresh()
  }

  const toggleBan = (u: AdminUserRow) => {
    if (u.is_banned) {
      act(u.id, { action: 'unban' }, `${u.email} unbanned`)
      return
    }
    const reason = window.prompt(
      `Ban ${u.email}?\n\nThis ends all their activity: listings removed, claims refunded, and spots they claimed returned to browse.\n\nOptional reason (shown in admin only):`
    )
    if (reason === null) return
    act(u.id, { action: 'ban', reason }, `${u.email} banned`)
  }

  const setBoost = (u: AdminUserRow, boost: number) => {
    const clamped = Math.max(-5, Math.min(5, boost))
    if (clamped === u.credibility_boost) return
    act(u.id, { action: 'set_boost', boost: clamped }, `Credibility set to ${clamped >= 0 ? '+' : ''}${clamped}`)
  }

  const filters = [
    { key: 'all', label: `All (${users.length})` },
    { key: 'banned', label: `Banned (${users.filter(u => u.is_banned).length})` },
    { key: 'boosted', label: `Adjusted (${users.filter(u => u.credibility_boost !== 0).length})` },
    { key: 'disputed', label: `Has disputes (${users.filter(u => u.buyerDisputed > 0).length})` },
  ] as const

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-white/5 border border-white/20 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
        />
      </div>

      {/* Filter pills */}
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
          No users match
        </p>
      ) : (
        <div className="border-t border-white/20">
          {filtered.map((u) => {
            const isOpen = expanded === u.id
            return (
              <div key={u.id} className="border-b border-white/20">
                <div className="flex items-start gap-4 py-4 px-1 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium">{u.full_name ?? '—'}</p>
                      {u.is_banned && (
                        <span className="text-[10px] uppercase tracking-widest border border-red-400/40 text-red-400 px-1.5 py-0.5">
                          Banned
                        </span>
                      )}
                      {u.credibility_boost !== 0 && (
                        <span className="text-[10px] uppercase tracking-widest border border-blue-400/40 text-blue-400 px-1.5 py-0.5">
                          {u.credibility_boost > 0 ? '+' : ''}{u.credibility_boost}
                        </span>
                      )}
                    </div>
                    <p className="text-white/50 text-xs truncate">{u.email}</p>
                    <p className="text-white/30 text-xs mt-0.5">
                      joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-center w-24 flex-shrink-0">
                    <p className="text-white/50 text-xs mb-1">Seller</p>
                    <p className="text-white font-semibold">
                      {u.sellerTotal > 0 || u.credibility_boost !== 0
                        ? `${'★'.repeat(u.stars)}${'☆'.repeat(5 - u.stars)}`
                        : 'New'}
                    </p>
                    <p className="text-white/40 text-xs">{u.sellerTotal} sales · {u.rate}%</p>
                  </div>

                  <div className="text-center w-24 flex-shrink-0">
                    <p className="text-white/50 text-xs mb-1">Buyer</p>
                    <p className="text-white font-semibold">{u.buyerTotal}</p>
                    {u.buyerDisputed > 0 && (
                      <p className="text-orange-400 text-xs">{u.buyerDisputed} disputed</p>
                    )}
                  </div>

                  <button
                    onClick={() => setExpanded(isOpen ? null : u.id)}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                    aria-label="Toggle actions"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="pb-4 px-1 space-y-3">
                    {u.is_banned && u.ban_reason && (
                      <p className="text-xs text-red-400">Ban reason: {u.ban_reason}</p>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-white/50">Credibility adjustment</span>
                      <div className="flex items-center gap-1">
                        {[-2, -1, 0, 1, 2].map((b) => (
                          <button
                            key={b}
                            disabled={busy === u.id}
                            onClick={() => setBoost(u, b)}
                            className={`text-xs w-9 py-1 border transition-colors disabled:opacity-40 ${
                              u.credibility_boost === b
                                ? 'border-blue-400 text-blue-400'
                                : 'border-white/20 text-white/50 hover:border-white/40'
                            }`}
                          >
                            {b > 0 ? `+${b}` : b}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-white/30">
                        base {u.baseStars}★ → shown {u.stars}★ · {u.holdHours}hr hold
                      </span>
                    </div>

                    <button
                      disabled={busy === u.id}
                      onClick={() => toggleBan(u)}
                      className={`inline-flex items-center gap-2 text-xs border px-3 py-1.5 transition-colors disabled:opacity-40 ${
                        u.is_banned
                          ? 'border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10'
                          : 'border-red-400/50 text-red-400 hover:bg-red-400/10'
                      }`}
                    >
                      {u.is_banned
                        ? <><ShieldCheck className="h-3.5 w-3.5" /> Unban user</>
                        : <><Ban className="h-3.5 w-3.5" /> Ban user</>}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

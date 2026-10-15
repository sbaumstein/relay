'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { timestampLabel } from '@/lib/datetime'
import { loadClaimThread, type AdminThreadMessage } from './actions'

interface AdminClaimThreadProps {
  claimId: string
  /** Display names only — this is correspondence, not a contact sheet. */
  buyerName?: string | null
  sellerName?: string | null
}

/**
 * The private conversation attached to a claim, for an adjudicating admin.
 *
 * Collapsed by default and loaded only when opened: nobody should read two
 * strangers' messages by accident, and the act of opening it is deliberate.
 * The read happens in a server action that re-checks getAdminUser() — see
 * ./actions.ts — because RLS rightly blocks the admin's own session from this.
 */
export function AdminClaimThread({
  claimId,
  buyerName,
  sellerName,
}: AdminClaimThreadProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AdminThreadMessage[] | null>(null)
  const [buyerId, setBuyerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (messages !== null || loading) return

    setLoading(true)
    const result = await loadClaimThread(claimId)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setBuyerId(result.buyerId)
    setMessages(result.messages)
  }

  const who = (senderId: string) => {
    if (!buyerId) return 'Party'
    return senderId === buyerId
      ? buyerName || 'Buyer'
      : sellerName || 'Seller'
  }

  return (
    <div className="border border-white/15 rounded-xl">
      <button
        type="button"
        onClick={() => void toggle()}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="text-xs text-white/50 uppercase tracking-widest">
          Private conversation
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {open ? 'Hide' : 'View'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[11px] text-amber-400/80 leading-relaxed">
            These are private messages between the buyer and the seller. You are
            reading them in an admin capacity to settle this case — don&apos;t share
            them outside it, and neither party is told you&apos;ve looked.
          </p>

          {loading && <p className="text-xs text-white/40">Loading conversation…</p>}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {!loading && !error && messages !== null && messages.length === 0 && (
            <p className="text-xs text-white/40">
              No messages were exchanged on this claim.
            </p>
          )}

          {!loading && !error && messages !== null && messages.length > 0 && (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="border border-white/15 rounded-xl px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <p className="text-[11px] text-white/60">{who(m.sender_id)}</p>
                    <p className="text-[11px] text-white/40 flex-shrink-0">
                      {timestampLabel(m.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

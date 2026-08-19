'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatCents } from '@/lib/stripe/helpers'

interface DisputeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispute: any
}

export function DisputeDecisionPanel({ dispute: d }: DisputeProps) {
  const [loading, setLoading] = useState<'buyer' | 'seller' | null>(null)
  const router = useRouter()

  const decide = async (favorOf: 'buyer' | 'seller') => {
    setLoading(favorOf)
    const res = await fetch(`/api/admin/disputes/${d.id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favor_of: favorOf }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
    toast.success(`Decided in favor of ${favorOf}`)
    router.refresh()
  }

  const classDate = d.listing?.class_datetime
    ? new Date(d.listing.class_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'

  return (
    <div className="border border-orange-400/30 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-orange-400 uppercase tracking-widest mb-1">Dispute</p>
          <p className="text-white font-semibold">{d.listing?.class_name ?? '—'}</p>
          <p className="text-white/50 text-xs">{d.listing?.studio_name} · {classDate}</p>
          <p className="text-white/50 text-xs">{d.listing?.address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white font-bold text-lg">{formatCents(d.amount_cents)}</p>
          <p className="text-white/40 text-xs">escrowed</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="bg-white/5 p-3">
          <p className="text-white/40 uppercase tracking-widest mb-1">Buyer</p>
          <p className="text-white">{d.claimer?.full_name ?? '—'}</p>
          <p className="text-white/50">{d.claimer?.email}</p>
        </div>
        <div className="bg-white/5 p-3">
          <p className="text-white/40 uppercase tracking-widest mb-1">Seller</p>
          <p className="text-white">{d.seller?.full_name ?? '—'}</p>
          <p className="text-white/50">{d.seller?.email}</p>
        </div>
      </div>

      <div className="bg-white/5 p-3 text-sm space-y-2">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Buyer&apos;s reason</p>
          <p className="text-white/80">{d.dispute_reason ?? '—'}</p>
        </div>
        {d.dispute_notes && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Buyer&apos;s notes</p>
            <p className="text-white/80 whitespace-pre-wrap">{d.dispute_notes}</p>
          </div>
        )}
        {(d.dispute_evidence_urls ?? []).length > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Buyer&apos;s attachments</p>
            <div className="flex flex-wrap gap-3">
              {d.dispute_evidence_urls.map((url: string, i: number) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
        {d.disputed_at && (
          <p className="text-white/30 text-xs">
            Filed {new Date(d.disputed_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Seller rebuttal */}
      <div className="bg-white/5 p-3 text-sm space-y-2">
        <p className="text-white/40 text-xs uppercase tracking-widest">Seller&apos;s response</p>
        {d.seller_responded_at ? (
          <>
            <p className="text-white/80 whitespace-pre-wrap">{d.seller_response}</p>
            {(d.seller_response_urls ?? []).length > 0 && (
              <div className="flex flex-wrap gap-3">
                {d.seller_response_urls.map((url: string, i: number) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            )}
            <p className="text-white/30 text-xs">
              Responded {new Date(d.seller_responded_at).toLocaleString()}
            </p>
          </>
        ) : d.seller_response_deadline && new Date(d.seller_response_deadline) < new Date() ? (
          <p className="text-red-400 text-xs">No response — 24h window closed {new Date(d.seller_response_deadline).toLocaleString()}</p>
        ) : (
          <p className="text-yellow-400 text-xs">
            Awaiting response{d.seller_response_deadline ? ` — due ${new Date(d.seller_response_deadline).toLocaleString()}` : ''}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => decide('buyer')}
          disabled={!!loading}
          className="flex-1 py-2.5 text-sm font-medium border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
        >
          {loading === 'buyer' ? 'Processing…' : `Dispute won — refund buyer · ${formatCents(d.amount_cents)}`}
        </button>
        <button
          onClick={() => decide('seller')}
          disabled={!!loading}
          className="flex-1 py-2.5 text-sm font-medium border border-blue-400/50 text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-40"
        >
          {loading === 'seller' ? 'Processing…' : `Dispute lost — pay seller · ${formatCents(d.seller_payout_cents)}`}
        </button>
      </div>
    </div>
  )
}

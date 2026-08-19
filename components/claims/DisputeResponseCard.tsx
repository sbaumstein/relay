'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { EvidenceUpload } from './EvidenceUpload'

interface DisputeResponseCardProps {
  claimId: string
  className: string
  reason: string | null
  notes: string | null
  buyerEvidence: string[]
  deadline: string | null
  respondedAt: string | null
}

function timeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return null
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

export function DisputeResponseCard({
  claimId, className, reason, notes, buyerEvidence, deadline, respondedAt,
}: DisputeResponseCardProps) {
  const [response, setResponse] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remaining = deadline ? timeLeft(deadline) : null
  const expired = !!deadline && !remaining

  const submit = async () => {
    if (!response.trim()) {
      toast.error('Please describe your side of the story')
      return
    }
    setLoading(true)
    const res = await fetch(`/api/claims/${claimId}/dispute-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response, evidence_urls: evidenceUrls }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error ?? 'Something went wrong'); return }
    toast.success('Your response was submitted — we\'ll review both sides.')
    router.refresh()
  }

  return (
    <div className="border border-orange-400/40 p-4 mt-2 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-400">
            A dispute was filed against you
          </p>
          <p className="text-xs text-white/60">{className}</p>
        </div>
      </div>

      <div className="bg-white/5 p-3 space-y-2 text-sm">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Buyer&apos;s reason</p>
          <p className="text-white/80">{reason ?? '—'}</p>
        </div>
        {notes && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Their notes</p>
            <p className="text-white/80 whitespace-pre-wrap">{notes}</p>
          </div>
        )}
        {buyerEvidence.length > 0 && (
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Their attachments</p>
            <div className="flex flex-wrap gap-2">
              {buyerEvidence.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {respondedAt ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          Response submitted — awaiting review
        </div>
      ) : expired ? (
        <p className="text-sm text-red-400">
          Your 24 hour response window has closed. We&apos;ll decide based on the buyer&apos;s evidence.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-orange-400 font-medium">
            {remaining} left to respond
          </p>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Explain what happened from your side…"
            rows={4}
            disabled={loading}
            className="w-full bg-white/5 border border-white/20 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
          />
          <EvidenceUpload
            value={evidenceUrls}
            onChange={setEvidenceUrls}
            prefix={`seller-${claimId}`}
            disabled={loading}
          />
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium border border-orange-400/50 text-orange-400 hover:bg-orange-400/10 transition-colors disabled:opacity-40"
          >
            {loading ? 'Submitting…' : 'Submit my response'}
          </button>
        </div>
      )}
    </div>
  )
}

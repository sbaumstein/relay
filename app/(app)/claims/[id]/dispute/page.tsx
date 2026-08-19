'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { EvidenceUpload } from '@/components/claims/EvidenceUpload'

const DISPUTE_REASONS = [
  'The booking confirmation was fake or invalid',
  'The seller became unresponsive after I paid',
  'The class details were materially different from the listing',
  'The booking could not be transferred to my name',
  'Other',
]

export default function DisputePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [details, setDetails] = useState('')
  const [notes, setNotes] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const reason = selected === 'Other' ? details.trim() : selected
    if (!reason) {
      toast.error('Please select or describe a reason')
      return
    }

    setLoading(true)
    const res = await fetch(`/api/claims/${id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, notes, evidence_urls: evidenceUrls }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
      return
    }

    toast.success('Dispute filed — we\'ll review and refund you shortly.')
    router.push('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">File a Dispute</h1>
      <p className="text-muted-foreground mb-6">
        Tell us what went wrong. We'll review and resolve it as quickly as possible.
      </p>

      <Card className="border-amber-200 bg-amber-50 mb-6">
        <CardContent className="py-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Only file a dispute if there is a genuine problem with the listing.
            Repeated false disputes will result in your account being banned.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3 mb-6">
        <Label>What went wrong?</Label>
        {DISPUTE_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
              selected === r
                ? 'border-primary bg-primary/5 font-medium'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {selected === 'Other' && (
        <div className="space-y-2 mb-6">
          <Label htmlFor="details">Please describe the issue</Label>
          <Textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what went wrong..."
            rows={4}
          />
        </div>
      )}

      <div className="space-y-2 mb-6">
        <Label htmlFor="notes">Additional notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else that helps us understand what happened — timeline, messages exchanged, etc."
          rows={4}
        />
      </div>

      <div className="space-y-2 mb-6">
        <Label>Supporting screenshots <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <p className="text-xs text-muted-foreground">
          Text messages, booking pages, emails — anything backing up your account.
        </p>
        <EvidenceUpload value={evidenceUrls} onChange={setEvidenceUrls} prefix={`buyer-${id}`} disabled={loading} />
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        The seller will be notified and has 24 hours to respond with their side before we decide.
      </p>

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={loading || !selected}
          variant="destructive"
        >
          {loading ? 'Submitting…' : 'Submit dispute'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

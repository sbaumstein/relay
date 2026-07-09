'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'

interface CheckInCardProps {
  claimId: string
  className: string
}

export function CheckInCard({ claimId, className }: CheckInCardProps) {
  const [loading, setLoading] = useState<'yes' | 'no' | null>(null)
  const [done, setDone] = useState<boolean | null>(null)

  const respond = async (attended: boolean) => {
    setLoading(attended ? 'yes' : 'no')
    const res = await fetch(`/api/claims/${claimId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended }),
    })
    const data = await res.json()
    setLoading(null)

    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
      return
    }

    setDone(attended)
    if (attended) {
      toast.success('Great! Your escrow will release to the seller in 24 hours.')
    } else {
      toast('Got it — we\'ll hold the funds and review your case.')
    }
  }

  if (done !== null) {
    return (
      <div className={`flex items-center gap-2 text-sm mt-2 ${done ? 'text-emerald-600' : 'text-orange-600'}`}>
        {done
          ? <><CheckCircle className="h-4 w-4" /> Checked in — escrow releasing in 24hrs</>
          : <><XCircle className="h-4 w-4" /> Under review — funds held</>}
      </div>
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50 mt-2">
      <CardContent className="py-3 px-4">
        <p className="text-sm font-medium text-amber-800 mb-2">
          🏃 {className} should be over — were you able to check in?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            disabled={!!loading}
            onClick={() => respond(true)}
          >
            {loading === 'yes' ? '…' : '✓ Yes, I went'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            disabled={!!loading}
            onClick={() => respond(false)}
          >
            {loading === 'no' ? '…' : '✗ No, I couldn\'t'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

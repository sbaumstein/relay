'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'

export function ConfirmTransferButton({ claimId, currentStatus }: { claimId: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (currentStatus === 'claimed') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400 py-3">
        <CheckCircle className="h-4 w-4" />
        Booking transfer confirmed
      </div>
    )
  }

  const handleConfirm = async () => {
    setLoading(true)
    const res = await fetch(`/api/claims/${claimId}/confirm`, { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(data.error ?? 'Something went wrong'); return }
    toast.success('Booking transfer confirmed — buyer can now check in after class.')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50">Someone has claimed your spot</p>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-2.5 text-sm font-medium border border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
      >
        {loading ? 'Confirming…' : '✓ Confirm booking transfer sent'}
      </button>
    </div>
  )
}

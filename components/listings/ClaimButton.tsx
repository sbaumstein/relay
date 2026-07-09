'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCents } from '@/lib/stripe/helpers'
import type { Listing } from '@/types'
import { ShieldCheck } from 'lucide-react'

interface ClaimButtonProps {
  listing: Listing
  isLoggedIn: boolean
  isOwner: boolean
}

export function ClaimButton({ listing, isLoggedIn, isOwner }: ClaimButtonProps) {
  const [loading, setLoading] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)
  const router = useRouter()

  if (isOwner) {
    return <p className="text-sm text-muted-foreground text-center">This is your listing</p>
  }

  if (!isLoggedIn) {
    return (
      <Button className="w-full" onClick={() => router.push(`/login?redirectTo=/listings/${listing.id}`)}>
        Sign in to claim
      </Button>
    )
  }

  if (claimId) {
    return (
      <div className="space-y-3">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Payment escrowed!</span>
            </div>
            <p>
              Your {formatCents(listing.price_cents)} is held securely. It releases to the seller
              24 hours after the class. Contact them to arrange booking transfer.
            </p>
            <p className="font-medium">{listing.seller?.email}</p>
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => router.push(`/claims/${claimId}/dispute`)}
        >
          Something went wrong? File a dispute
        </Button>
      </div>
    )
  }

  const handleClaim = async () => {
    setLoading(true)
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listing.id }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
      return
    }

    // TODO: if data.requiresPayment, show Stripe payment form
    setClaimId(data.claimId ?? data.claim?.id)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" size="lg" onClick={handleClaim} disabled={loading}>
        {loading ? 'Processing…' : `Claim · ${formatCents(listing.price_cents)}`}
      </Button>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
        <p>
          Your payment is held in escrow and automatically released to the seller 24 hours
          after the class. File a dispute before class time if anything goes wrong.
        </p>
      </div>
    </div>
  )
}

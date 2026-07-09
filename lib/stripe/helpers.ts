const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 10) / 100
const MINIMUM_PLATFORM_FEE_CENTS = 50 // $0.50

export function calculateFees(priceCents: number) {
  const platformFeeCents = Math.max(
    Math.round(priceCents * PLATFORM_FEE_PERCENT),
    MINIMUM_PLATFORM_FEE_CENTS
  )
  return {
    platformFeeCents,
    sellerPayoutCents: priceCents - platformFeeCents,
  }
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

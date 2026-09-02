/** How close to class time the seller's fallback price kicks in. */
export const DISCOUNT_WINDOW_HOURS = 2

interface PriceableListing {
  price_cents: number
  discount_price_cents?: number | null
  class_datetime: string
}

export interface EffectivePrice {
  cents: number
  /** True when the last-minute price is currently in effect. */
  discounted: boolean
  /** The original price, present only when a discount is active. */
  originalCents?: number
}

/**
 * Resolved at read time rather than by a scheduled job, so a listing's price
 * is always correct without anything having to run on a timer.
 */
export function getEffectivePrice(
  listing: PriceableListing,
  now: Date = new Date(),
): EffectivePrice {
  const discount = listing.discount_price_cents
  if (discount == null || discount >= listing.price_cents) {
    return { cents: listing.price_cents, discounted: false }
  }

  const classTime = new Date(listing.class_datetime).getTime()
  const windowOpens = classTime - DISCOUNT_WINDOW_HOURS * 60 * 60 * 1000

  if (now.getTime() >= windowOpens) {
    return { cents: discount, discounted: true, originalCents: listing.price_cents }
  }
  return { cents: listing.price_cents, discounted: false }
}

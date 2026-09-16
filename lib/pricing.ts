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

/**
 * A resold spot competes with the studio's own booking page, so it has to
 * undercut retail to be worth claiming. These bounds are applied to the
 * midpoint of the studio's usual drop-in range.
 */
const RESALE_FLOOR_RATIO = 0.6
const RESALE_CEILING_RATIO = 0.85

export interface PriceRecommendation {
  lowCents: number
  highCents: number
  suggestedCents: number
  retailMinCents: number
  retailMaxCents: number
}

interface StudioPricing {
  price_min_cents?: number | null
  price_max_cents?: number | null
}

/** Null when the studio has no price data to base a recommendation on. */
export function getRecommendedPrice(studio: StudioPricing | null | undefined): PriceRecommendation | null {
  const min = studio?.price_min_cents
  const max = studio?.price_max_cents
  if (min == null || max == null || min <= 0 || max <= 0) return null

  const midpoint = (min + max) / 2
  // Whole dollars — odd cents read as arbitrary rather than considered.
  const toDollar = (cents: number) => Math.max(100, Math.round(cents / 100) * 100)

  const lowCents = toDollar(midpoint * RESALE_FLOOR_RATIO)
  const highCents = toDollar(midpoint * RESALE_CEILING_RATIO)

  return {
    lowCents,
    highCents,
    suggestedCents: toDollar((lowCents + highCents) / 2),
    retailMinCents: min,
    retailMaxCents: max,
  }
}

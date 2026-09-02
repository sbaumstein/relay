export type CancellationPolicy = 'fixed_fee' | 'full_class'
export type PaymentType = 'prepaid' | 'pay_in_person'

export interface Studio {
  id: string
  name: string
  cancellation_policy: CancellationPolicy
  cancellation_fee_cents: number | null
  payment_type: PaymentType
  is_active: boolean
  created_at: string
}

export interface SellerStats {
  total: number        // total claims as seller
  completed: number    // completed + auto_released
  rate: number         // completion % (0–100)
  stars: number        // 0–5 (0 = New, below threshold)
  holdHours: number    // escrow hold time in hours
}

const MIN_CLAIMS = 5  // minimum before stars show

const HOLD_HOURS_BY_STARS: Record<number, number> = {
  5: 6, 4: 12, 3: 18, 2: 24, 1: 36, 0: 48,
}

/**
 * @param boost Manual admin adjustment (-5..+5) applied on top of the
 *              history-derived rating. Also shortens the escrow hold.
 */
export function getSellerStats(total: number, completed: number, boost = 0): SellerStats {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  let stars = 0

  if (total >= MIN_CLAIMS) {
    if (rate >= 95)      stars = 5
    else if (rate >= 90) stars = 4
    else if (rate >= 85) stars = 3
    else if (rate >= 75) stars = 2
    else if (rate >= 60) stars = 1
    else                 stars = 0
  }

  const boosted = Math.max(0, Math.min(5, stars + boost))
  // A boost only shortens the hold once the seller is out of the "New" state,
  // so a brand-new account can't be handed a 6 hour hold by accident.
  const holdHours = total >= MIN_CLAIMS || boost > 0
    ? HOLD_HOURS_BY_STARS[boosted]
    : 48

  return { total, completed, rate, stars: boosted, holdHours }
}

export type ClassType =
  | 'yoga'
  | 'pilates'
  | 'spinning'
  | 'barre'
  | 'hiit'
  | 'boxing'
  | 'strength'
  | 'dance'
  | 'meditation'
  | 'other'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'

export type ListingStatus = 'available' | 'claimed' | 'expired' | 'cancelled'
export type ClaimStatus =
  | 'pending_payment'       // Stripe payment not yet captured
  | 'pending_confirmation'  // Claimed, seller needs to confirm booking transfer
  | 'claimed'               // Seller confirmed booking transferred to buyer
  | 'completed'             // Buyer attended, escrow released to seller
  | 'disputed'              // Issue reported, admin reviewing
  | 'dispute_won'           // Admin ruled for buyer — refunded
  | 'dispute_lost'          // Admin ruled for seller — seller keeps payment
  | 'auto_released'
  | 'refunded'
  | 'needs_review'
  | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  created_at: string
  updated_at: string
  // Admin moderation
  is_banned?: boolean
  banned_at?: string | null
  ban_reason?: string | null
  credibility_boost?: number
  admin_notes?: string | null
}

export interface Listing {
  id: string
  seller_id: string
  studio_id: string | null
  studio_name: string
  class_name: string
  instructor_name: string | null
  class_type: ClassType
  skill_level: SkillLevel
  description: string | null
  class_date: string
  class_time: string
  class_datetime: string
  duration_minutes: number | null
  address: string
  neighborhood: string | null
  price_cents: number
  is_free: boolean
  confirmation_screenshot_url: string | null
  status: ListingStatus
  created_at: string
  updated_at: string
  seller?: Profile
  studio?: Studio
}

export interface Claim {
  id: string
  listing_id: string
  claimer_id: string
  seller_id: string
  amount_cents: number
  platform_fee_cents: number
  seller_payout_cents: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  stripe_charge_id: string | null
  cancellation_fee_cents: number
  expires_at: string | null
  disputed_at: string | null
  dispute_reason: string | null
  status: ClaimStatus
  created_at: string
  updated_at: string
  listing?: Listing
}

export interface NewListingFormData {
  studio_id: string
  studio_name: string
  class_name: string
  instructor_name?: string
  class_type: ClassType
  skill_level: SkillLevel
  description?: string
  class_date: string
  class_time: string
  duration_minutes?: number
  address: string
  neighborhood?: string
  price_cents: number
}

export interface ListingFilters {
  class_type?: ClassType
  is_free?: boolean
  neighborhood?: string
  date_from?: string
  date_to?: string
}

export const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'spinning', label: 'Spinning' },
  { value: 'barre', label: 'Barre' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'strength', label: 'Strength' },
  { value: 'dance', label: 'Dance' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'other', label: 'Other' },
]

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  yoga: 'bg-emerald-100 text-emerald-800',
  pilates: 'bg-purple-100 text-purple-800',
  spinning: 'bg-orange-100 text-orange-800',
  barre: 'bg-pink-100 text-pink-800',
  hiit: 'bg-red-100 text-red-800',
  boxing: 'bg-yellow-100 text-yellow-800',
  strength: 'bg-blue-100 text-blue-800',
  dance: 'bg-violet-100 text-violet-800',
  meditation: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800',
}

// NYC neighborhoods for MVP
export const NEIGHBORHOODS = [
  'Upper East Side',
  'Upper West Side',
  'Midtown',
  'Chelsea',
  'Flatiron',
  'Greenwich Village',
  'SoHo',
  'Tribeca',
  'Lower East Side',
  'East Village',
  'West Village',
  'Williamsburg',
  'Park Slope',
  'DUMBO',
  'Astoria',
  'Long Island City',
  'Other',
]

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'all_levels', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]


export const PLATFORM_FEE_PERCENT = 10

import { CONFIRMATION_RELEASE_HOURS } from '@/lib/pricing'

/** How long after the class ends either side can still raise a problem. */
export const DISPUTE_WINDOW_HOURS = 48

const HOUR = 60 * 60 * 1000
const DEFAULT_CLASS_MINUTES = 60

interface ClassTiming {
  class_datetime: string
  duration_minutes?: number | null
}

export interface DisputeWindow {
  /** Opens with the booking confirmation, so both sides can see what they got. */
  opensAt: Date
  /** Closes DISPUTE_WINDOW_HOURS after the class ends. */
  closesAt: Date
  isOpen: boolean
  hasClosed: boolean
}

export function getDisputeWindow(listing: ClassTiming, now: Date = new Date()): DisputeWindow {
  const start = new Date(listing.class_datetime).getTime()
  const end = start + (listing.duration_minutes ?? DEFAULT_CLASS_MINUTES) * 60 * 1000

  const opensAt = new Date(start - CONFIRMATION_RELEASE_HOURS * HOUR)
  const closesAt = new Date(end + DISPUTE_WINDOW_HOURS * HOUR)

  return {
    opensAt,
    closesAt,
    isOpen: now >= opensAt && now <= closesAt,
    hasClosed: now > closesAt,
  }
}

import Link from 'next/link'
import { MapPin, Clock, Calendar } from 'lucide-react'
import { StarRating } from '@/components/ui/StarRating'
import { CLASS_TYPES, SKILL_LEVELS, getSellerStats } from '@/types'
import type { Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'

interface ListingCardProps {
  listing: Listing
  sellerStats?: SellerStats
}

export function ListingCard({ listing, sellerStats }: ListingCardProps) {
  const classDate = new Date(listing.class_datetime)
  const dateLabel = classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = classDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const classTypeLabel = CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type
  const skillLabel = SKILL_LEVELS.find((s) => s.value === listing.skill_level)?.label ?? listing.skill_level
  const stats = sellerStats ?? getSellerStats(0, 0)

  return (
    <Link href={`/listings/${listing.id}`} className="block group">
      <div className="border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all p-5 flex flex-col gap-3">
        {/* Studio + price */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest truncate">
            {listing.studio_name}
          </p>
          {listing.is_free ? (
            <span className="text-xs font-bold text-emerald-400">Free</span>
          ) : (
            <span className="text-base font-bold text-white">{formatCents(listing.price_cents)}</span>
          )}
        </div>

        {/* Class name */}
        <h3 className="font-semibold text-white text-base leading-snug">{listing.class_name}</h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-white/60 border border-white/20 px-2 py-0.5">{classTypeLabel}</span>
          <span className="text-xs text-white/60 border border-white/20 px-2 py-0.5">{skillLabel}</span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{timeLabel}{listing.duration_minutes ? ` · ${listing.duration_minutes} min` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {listing.neighborhood ? `${listing.neighborhood} · ` : ''}{listing.address}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <StarRating stars={stats.stars} total={stats.total} />
          <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors uppercase tracking-widest">
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}

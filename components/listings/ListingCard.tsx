import Link from 'next/link'
import { CLASS_TYPES, SKILL_LEVELS, getSellerStats } from '@/types'
import type { Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'
import { StarRating } from '@/components/ui/StarRating'

interface ListingCardProps {
  listing: Listing
  sellerStats?: SellerStats
}

export function ListingCard({ listing, sellerStats }: ListingCardProps) {
  const classDate = new Date(listing.class_datetime)
  const day = classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = classDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const classTypeLabel = CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type
  const skillLabel = SKILL_LEVELS.find((s) => s.value === listing.skill_level)?.label ?? listing.skill_level
  const stats = sellerStats ?? getSellerStats(0, 0)

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="flex items-center gap-6 py-4 px-2 border-b border-white/8 hover:bg-white/4 transition-colors">

        {/* Date column */}
        <div className="w-24 flex-shrink-0 text-center">
          <p className="text-xs text-white/40 uppercase tracking-widest">
            {classDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className="text-2xl font-bold text-white leading-none mt-0.5">
            {classDate.getDate()}
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {classDate.toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-xs text-white/60 mt-1 font-medium">{time}</p>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-white/10 flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5 truncate">
            {listing.studio_name}
          </p>
          <p className="text-white font-semibold text-base truncate">{listing.class_name}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-white/40">{classTypeLabel}</span>
            <span className="text-white/20">·</span>
            <span className="text-xs text-white/40">{skillLabel}</span>
            {listing.address && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/40 truncate">{listing.neighborhood ?? listing.address}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: price + stars */}
        <div className="flex-shrink-0 text-right">
          {listing.is_free ? (
            <p className="text-emerald-400 font-bold text-sm">Free</p>
          ) : (
            <p className="text-white font-bold text-lg">{formatCents(listing.price_cents)}</p>
          )}
          <div className="mt-1">
            <StarRating stars={stats.stars} total={stats.total} />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-white/20 group-hover:text-white/60 transition-colors text-lg">→</div>
      </div>
    </Link>
  )
}

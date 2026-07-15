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
      <div className="flex items-center gap-3 sm:gap-6 py-4 px-2 border-b border-white/20 hover:bg-white/8 transition-colors">

        {/* Date column */}
        <div className="w-14 sm:w-20 flex-shrink-0 text-center">
          <p className="text-[10px] text-white/70 uppercase tracking-widest hidden sm:block">
            {classDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-white leading-none">
            {classDate.getDate()}
          </p>
          <p className="text-[10px] text-white/75 mt-0.5">
            {classDate.toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 font-medium">{time}</p>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/10 flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/75 uppercase tracking-widest mb-0.5 truncate">
            {listing.studio_name}
          </p>
          <p className="text-white font-semibold text-sm sm:text-base truncate">{listing.class_name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] sm:text-xs text-white/70">{classTypeLabel}</span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-[10px] sm:text-xs text-white/70">{skillLabel}</span>
            {listing.neighborhood && (
              <>
                <span className="text-white/40 text-xs hidden sm:inline">·</span>
                <span className="text-[10px] text-white/70 truncate hidden sm:inline">{listing.neighborhood}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: price + stars */}
        <div className="flex-shrink-0 text-right">
          {listing.is_free ? (
            <p className="text-emerald-400 font-bold text-sm">Free</p>
          ) : (
            <p className="text-white font-bold text-base sm:text-lg">{formatCents(listing.price_cents)}</p>
          )}
          <div className="mt-1 hidden sm:block">
            <StarRating stars={stats.stars} total={stats.total} />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-white/50 group-hover:text-white/70 transition-colors">→</div>
      </div>
    </Link>
  )
}

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getSellerStats } from '@/types'
import type { Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'
import { getEffectivePrice } from '@/lib/pricing'
import { StarRating } from '@/components/ui/StarRating'
import { weekdayShort, monthShort, dayOfMonth, timeLabel } from '@/lib/datetime'

interface ListingCardProps {
  listing: Listing
  sellerStats?: SellerStats
}

/**
 * A flat row rather than a card: the surface only appears under the cursor, so
 * a long list reads as one column instead of a wall of containers.
 */
export function ListingCard({ listing, sellerStats }: ListingCardProps) {
  const classDate = new Date(listing.class_datetime)
  const stats = sellerStats ?? getSellerStats(0, 0)
  const price = getEffectivePrice(listing)

  const meta = [listing.studio_name, listing.neighborhood].filter(Boolean).join(' · ')

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="flex items-center gap-4 sm:gap-6 px-3 sm:px-4 py-4 rounded-xl transition-colors group-hover:bg-white/[0.07]">

        {/* Date */}
        <div className="w-24 sm:w-28 flex-shrink-0">
          <p className="text-white font-semibold leading-tight">
            {monthShort(classDate)} {dayOfMonth(classDate)}
          </p>
          <p className="text-xs sm:text-sm text-white/50 leading-tight mt-0.5 whitespace-nowrap">
            {weekdayShort(classDate)} · {timeLabel(classDate)}
          </p>
        </div>

        {/* Class */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold truncate">{listing.class_name}</p>
            {price.discounted && (
              <span className="flex-shrink-0 text-[10px] uppercase tracking-widest text-emerald-400">
                Last minute
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-white/50 truncate mt-0.5">{meta}</p>
        </div>

        {/* Seller standing, once there is one worth showing */}
        {stats.total >= 5 && (
          <div className="flex-shrink-0 hidden sm:block">
            <StarRating stars={stats.stars} total={stats.total} />
          </div>
        )}

        <div className="flex-shrink-0">
          <span
            className={`inline-block rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
              listing.is_free
                ? 'border-emerald-400/40 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-black'
                : 'border-white/25 text-white group-hover:bg-white group-hover:text-black'
            }`}
          >
            {listing.is_free ? 'Free' : formatCents(price.cents)}
          </span>
          {price.discounted && (
            <p className="text-[10px] text-white/40 line-through text-center mt-0.5">
              {formatCents(price.originalCents!)}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/25 group-hover:text-white/60 transition-colors" />
      </div>
    </Link>
  )
}

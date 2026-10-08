import Link from 'next/link'
import { CLASS_TYPES, getSellerStats } from '@/types'
import type { Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'
import { getEffectivePrice } from '@/lib/pricing'
import { StarRating } from '@/components/ui/StarRating'
import { weekdayShort, monthShort, dayOfMonth, timeLabel } from '@/lib/datetime'

/**
 * Listings have no photography, so the card's visual slot is a single warm
 * tint with the studio as its subject. The class type is named in the corner
 * label, so colour doesn't need to encode it.
 */
const TILE_TINT = 'from-white to-neutral-200'

interface ListingCardProps {
  listing: Listing
  sellerStats?: SellerStats
}

export function ListingCard({ listing, sellerStats }: ListingCardProps) {
  const classDate = new Date(listing.class_datetime)
  const classTypeLabel =
    CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type
  const stats = sellerStats ?? getSellerStats(0, 0)
  const price = getEffectivePrice(listing)
  const logoUrl = listing.studio?.logo_url ?? null
  // A long name would wrap to two lines and crowd the short tile.
  const wordmarkSize =
    listing.studio_name.length > 16 ? 'text-sm' : 'text-lg'

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      {/* Visual — the studio is the subject; the date is supporting detail. */}
      <div
        className={`relative aspect-[5/2] rounded-xl overflow-hidden bg-gradient-to-br ${TILE_TINT} border border-white/10`}
      >
        <span className="absolute top-2.5 left-3 text-[10px] uppercase tracking-widest text-neutral-500">
          {classTypeLabel}
        </span>

        {price.discounted && (
          <span className="absolute top-2.5 right-2.5 text-[10px] uppercase tracking-widest text-emerald-700 border border-emerald-600/40 rounded-full px-2 py-0.5">
            Last minute
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center px-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={listing.studio_name}
              className="max-h-10 max-w-[75%] object-contain opacity-95"
            />
          ) : (
            // No asset yet, so set the name as a wordmark rather than leave a hole.
            <p className={`text-center ${wordmarkSize} font-bold uppercase tracking-widest text-neutral-900 leading-tight`}>
              {listing.studio_name}
            </p>
          )}
        </div>

      </div>

      {/* Detail — the tile already carries the studio, so lead with the class. */}
      <div className="mt-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-semibold text-sm truncate group-hover:underline">
            {listing.class_name}
          </p>
          {stats.total >= 5 && (
            <div className="flex-shrink-0 pt-0.5">
              <StarRating stars={stats.stars} total={stats.total} />
            </div>
          )}
        </div>

        <p className="text-sm text-white/50 truncate">
          {weekdayShort(classDate)} {dayOfMonth(classDate)} {monthShort(classDate)} · {timeLabel(classDate)}
        </p>

        {listing.neighborhood && (
          <p className="text-sm text-white/40 truncate">{listing.neighborhood}</p>
        )}

        <p className="mt-1.5 text-sm">
          {listing.is_free ? (
            <span className="text-emerald-400 font-semibold">Free</span>
          ) : (
            <>
              <span className="text-white font-semibold">{formatCents(price.cents)}</span>
              {price.discounted && (
                <span className="text-white/40 line-through ml-1.5">
                  {formatCents(price.originalCents!)}
                </span>
              )}
            </>
          )}
        </p>
      </div>
    </Link>
  )
}

import Link from 'next/link'
import { CLASS_TYPES, getSellerStats } from '@/types'
import type { ClassType, Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'
import { getEffectivePrice } from '@/lib/pricing'
import { StarRating } from '@/components/ui/StarRating'
import { weekdayShort, monthShort, dayOfMonth, timeLabel } from '@/lib/datetime'

/**
 * Listings have no photography, so the card's visual slot is built from the
 * class type instead — a tint per discipline, with the date as the subject.
 * Muted on purpose: the grid should read as one surface, not ten.
 */
const CLASS_TYPE_TINT: Record<ClassType, string> = {
  yoga:       'from-emerald-900/50 to-emerald-950/20',
  pilates:    'from-purple-900/50 to-purple-950/20',
  spinning:   'from-orange-900/50 to-orange-950/20',
  barre:      'from-pink-900/50 to-pink-950/20',
  hiit:       'from-red-900/50 to-red-950/20',
  boxing:     'from-amber-900/50 to-amber-950/20',
  strength:   'from-blue-900/50 to-blue-950/20',
  dance:      'from-violet-900/50 to-violet-950/20',
  meditation: 'from-teal-900/50 to-teal-950/20',
  other:      'from-neutral-800/60 to-neutral-900/20',
}

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
  const tint = CLASS_TYPE_TINT[listing.class_type] ?? CLASS_TYPE_TINT.other

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      {/* Visual */}
      <div
        className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br ${tint} border border-white/10`}
      >
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-white/70">
          {classTypeLabel}
        </span>

        {price.discounted && (
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-emerald-300 border border-emerald-400/40 rounded-full px-2 py-0.5">
            Last minute
          </span>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold text-white leading-none">{dayOfMonth(classDate)}</p>
          <p className="text-xs uppercase tracking-widest text-white/60 mt-1.5">
            {monthShort(classDate)}
          </p>
        </div>

        <span className="absolute bottom-3 left-3 text-xs text-white/70">
          {weekdayShort(classDate)} · {timeLabel(classDate)}
        </span>
      </div>

      {/* Detail */}
      <div className="mt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-semibold truncate group-hover:underline">
            {listing.studio_name}
          </p>
          {/* No rating yet is better said with silence than with a label on
              every card. */}
          {stats.total >= 5 && (
            <div className="flex-shrink-0 pt-0.5">
              <StarRating stars={stats.stars} total={stats.total} />
            </div>
          )}
        </div>

        <p className="text-sm text-white/60 truncate">{listing.class_name}</p>

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

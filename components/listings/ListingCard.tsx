import Link from 'next/link'
import { MapPin, Clock, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/StarRating'
import { CLASS_TYPE_COLORS, CLASS_TYPES, SKILL_LEVELS, getSellerStats } from '@/types'
import type { Listing, SellerStats } from '@/types'
import { formatCents } from '@/lib/stripe/helpers'

interface ListingCardProps {
  listing: Listing
  sellerStats?: SellerStats
}

const SKILL_LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced:     'bg-red-100 text-red-800',
  all_levels:   'bg-gray-100 text-gray-700',
}

export function ListingCard({ listing, sellerStats }: ListingCardProps) {
  const classDate = new Date(listing.class_datetime)
  const dateLabel = classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = classDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const classTypeLabel = CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type
  const colorClass = CLASS_TYPE_COLORS[listing.class_type]
  const skillLabel = SKILL_LEVELS.find((s) => s.value === listing.skill_level)?.label ?? listing.skill_level
  const skillColorClass = SKILL_LEVEL_COLORS[listing.skill_level] ?? 'bg-gray-100 text-gray-700'
  const stats = sellerStats ?? getSellerStats(0, 0)

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header: gym name + price */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {listing.studio_name}
          </p>
          <div className="flex-shrink-0">
            {listing.is_free ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>
            ) : (
              <span className="text-base font-bold">{formatCents(listing.price_cents)}</span>
            )}
          </div>
        </div>

        {/* Class name */}
        <h3 className="font-semibold text-base leading-snug mb-3 truncate">{listing.class_name}</h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>{classTypeLabel}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${skillColorClass}`}>{skillLabel}</span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm text-muted-foreground flex-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{timeLabel}{listing.duration_minutes ? ` · ${listing.duration_minutes} min` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {listing.neighborhood ? `${listing.neighborhood} · ` : ''}{listing.address}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 gap-2">
          <StarRating stars={stats.stars} total={stats.total} />
          <Button asChild size="sm">
            <Link href={`/listings/${listing.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { notFound } from 'next/navigation'
import { MapPin, Clock, User, Calendar, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from '@/components/listings/ClaimButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CLASS_TYPE_COLORS, CLASS_TYPES, SKILL_LEVELS, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import { formatCents } from '@/lib/stripe/helpers'
import type { Listing } from '@/types'

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: listingData }, { data: reputationData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('listings')
      .select('*, seller:profiles!seller_id(id, full_name, email), studio:studios(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('claims')
      .select('seller_id, status'),
  ])

  if (!listingData) notFound()

  const listing = listingData as Listing

  // Compute seller stats
  const allSellerClaims = (reputationData ?? []).filter(
    (c: { seller_id: string }) => c.seller_id === listing.seller_id
  )
  const sellerTotal = allSellerClaims.length
  const sellerCompleted = allSellerClaims.filter(
    (c: { status: string }) => c.status === 'completed' || c.status === 'auto_released'
  ).length
  const sellerStats = getSellerStats(sellerTotal, sellerCompleted)

  const isOwner = user?.id === listing.seller_id
  const isLoggedIn = !!user

  const classDate = new Date(listing.class_datetime)
  const dateLabel = classDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const timeLabel = classDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  const classTypeLabel = CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type
  const colorClass = CLASS_TYPE_COLORS[listing.class_type]
  const skillLabel = SKILL_LEVELS.find((s) => s.value === listing.skill_level)?.label

  const studio = listing.studio as { name: string; cancellation_policy: string; cancellation_fee_cents: number | null; payment_type: string } | null

  const cancellationFeeDisplay = studio
    ? studio.cancellation_policy === 'fixed_fee'
      ? formatCents(studio.cancellation_fee_cents ?? 0)
      : 'Full class price'
    : null

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
              {classTypeLabel}
            </span>
            {skillLabel && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {skillLabel}
              </span>
            )}
            {listing.status !== 'available' && (
              <Badge variant="secondary">
                {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{studio?.name ?? listing.studio_name}</p>
          <h1 className="text-3xl font-bold mt-1">{listing.class_name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Details */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{dateLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {timeLabel}{listing.duration_minutes ? ` · ${listing.duration_minutes} min` : ''}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{listing.neighborhood ?? 'Location'}</p>
                  <p className="text-sm text-muted-foreground">{listing.address}</p>
                </div>
              </div>

              {listing.instructor_name && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <p className="text-sm">{listing.instructor_name}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Price + Claim */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Class price (escrowed)</p>
                <p className="text-2xl font-bold">{formatCents(listing.price_cents)}</p>
                {studio && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No-show fee to seller: {cancellationFeeDisplay}
                  </p>
                )}
              </div>

              {listing.status === 'available' ? (
                <ClaimButton listing={listing} isLoggedIn={isLoggedIn} isOwner={isOwner} />
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="font-medium">This spot is no longer available</p>
                  <Link href="/browse" className="text-sm underline mt-1 block">
                    Browse other listings
                  </Link>
                </div>
              )}

              {/* Seller reputation */}
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Posted by {listing.seller?.full_name ?? 'Anonymous'}
                  </span>
                  <StarRating stars={sellerStats.stars} total={sellerStats.total} showLabel />
                </div>
                <p className="text-xs text-muted-foreground">
                  Escrow releases {sellerStats.holdHours}hr after class
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking confirmation screenshot */}
        {listing.confirmation_screenshot_url && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h2 className="font-semibold">Booking confirmation</h2>
              </div>
              <img
                src={listing.confirmation_screenshot_url}
                alt="Booking confirmation"
                className="rounded-lg border max-h-64 object-contain"
              />
            </CardContent>
          </Card>
        )}

        {/* Studio cancellation policy */}
        {studio && (
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="p-5 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">{studio.name} cancellation policy</p>
              <p>
                If you don't show up, <strong>{cancellationFeeDisplay}</strong> is released to the seller
                from your escrowed payment. The remainder is refunded to you.
              </p>
              <p>Payment type: {studio.payment_type === 'prepaid' ? 'Prepaid' : 'Pay in person'}</p>
            </CardContent>
          </Card>
        )}

        {listing.description && (
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-2">Notes from seller</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

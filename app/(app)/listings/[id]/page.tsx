import { notFound } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Maximize2, Pencil } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from '@/components/listings/ClaimButton'
import { CLASS_TYPES, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import { formatCents } from '@/lib/stripe/helpers'
import { getEffectivePrice, DISCOUNT_WINDOW_HOURS, CONFIRMATION_RELEASE_HOURS } from '@/lib/pricing'
import { DEFAULT_HOLD_HOURS } from '@/lib/autoRelease'
import type { Listing } from '@/types'
import { longDateLabel, timeLabel } from '@/lib/datetime'

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

  // Check if the current user has an active claim on this listing
  let userHasClaim = false
  if (user) {
    const { data: userClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('listing_id', id)
      .eq('claimer_id', user.id)
      .not('status', 'in', '("disputed","dispute_won","dispute_lost","refunded")')
      .maybeSingle()
    userHasClaim = !!userClaim
  }

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
  const dateLabel = longDateLabel(classDate)
  const timeText = timeLabel(classDate)

  const classTypeLabel = CLASS_TYPES.find((t) => t.value === listing.class_type)?.label ?? listing.class_type

  const studio = listing.studio as {
    name: string
    cancellation_policy: string
    cancellation_fee_cents: number | null
    payment_type: string
    cancellation_cutoff_label?: string | null
    cancellation_notes?: string | null
  } | null

  const price = getEffectivePrice(listing)

  // The confirmation screenshot carries the seller's booking details, so it is
  // released only to someone who has actually claimed the spot, and only once
  // the class is close enough that they need it to get in.
  const msUntilClass = classDate.getTime() - Date.now()
  const withinReleaseWindow = msUntilClass <= CONFIRMATION_RELEASE_HOURS * 60 * 60 * 1000
  const canSeeConfirmation = isOwner || (userHasClaim && withinReleaseWindow)

  const cancellationFeeDisplay = studio
    ? studio.cancellation_policy === 'fixed_fee'
      ? formatCents(studio.cancellation_fee_cents ?? 0)
      : 'Full class price'
    : null

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-xs text-white/50 uppercase tracking-widest hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to browse
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-white/50 uppercase tracking-widest">
              {classTypeLabel}
            </span>
            {listing.status !== 'available' && (
              <>
                <span className="text-white/25 text-xs">·</span>
                <span className="text-xs text-white/50 uppercase tracking-widest">
                  {listing.status}
                </span>
              </>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">{listing.class_name}</h1>
              <p className="text-white/60 mt-1">{studio?.name ?? listing.studio_name}</p>
            </div>
            {isOwner && listing.status === 'available' && (
              <Link
                href={`/listings/${listing.id}/edit`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-white border border-white/20 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Details */}
          <div className="border border-white/20 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest">When</p>
              <p className="text-white font-bold mt-1">{dateLabel}</p>
              <p className="text-sm text-white/60">
                {timeText}{listing.duration_minutes ? ` · ${listing.duration_minutes} min` : ''}
              </p>
            </div>

            <div className="border-t border-white/15 pt-4">
              <p className="text-xs text-white/50 uppercase tracking-widest">Where</p>
              <p className="text-white font-bold mt-1">{listing.neighborhood ?? 'Location'}</p>
              <p className="text-sm text-white/60">{listing.address}</p>
            </div>

            {listing.instructor_name && (
              <div className="border-t border-white/15 pt-4">
                <p className="text-xs text-white/50 uppercase tracking-widest">Instructor</p>
                <p className="text-white font-bold mt-1">{listing.instructor_name}</p>
              </div>
            )}
          </div>

          {/* Price + Claim */}
          <div className="border border-white/20 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest">Price</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className={`text-3xl font-bold ${price.discounted ? 'text-emerald-400' : 'text-white'}`}>
                  {formatCents(price.cents)}
                </p>
                {price.discounted && (
                  <p className="text-sm text-white/50 line-through">
                    {formatCents(price.originalCents!)}
                  </p>
                )}
              </div>
              {price.discounted && (
                <p className="text-xs text-emerald-400 mt-1">Last-minute price</p>
              )}
              {!price.discounted && listing.discount_price_cents != null && (
                <p className="text-xs text-white/50 mt-1">
                  Drops to {formatCents(listing.discount_price_cents)} within{' '}
                  {DISCOUNT_WINDOW_HOURS} hours of class
                </p>
              )}
              {studio && (
                <p className="text-xs text-white/50 mt-1">
                  No-show fee to seller: {cancellationFeeDisplay}
                </p>
              )}
            </div>

            {listing.status === 'available' ? (
              <ClaimButton
                listing={{ ...listing, confirmation_screenshot_url: null }}
                isLoggedIn={isLoggedIn}
                isOwner={isOwner}
              />
            ) : isOwner && listing.status === 'claimed' ? (
              <div className="border-t border-white/15 pt-4">
                <p className="text-xs text-emerald-400 uppercase tracking-widest">Claimed</p>
                <p className="text-sm text-white/60 mt-1">
                  Send the buyer your booking details. You get paid{' '}
                  {DEFAULT_HOLD_HOURS} hours after the class unless they report a problem.
                </p>
              </div>
            ) : (
              <div className="border-t border-white/15 pt-4">
                <p className="text-white font-bold">This spot is no longer available</p>
                <Link
                  href="/browse"
                  className="text-sm text-white/60 underline hover:text-white transition-colors mt-1 inline-block"
                >
                  Browse other listings
                </Link>
              </div>
            )}

            {/* Seller reputation */}
            <div className="border-t border-white/15 pt-4 space-y-1">
              <p className="text-xs text-white/50 uppercase tracking-widest">Seller</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white">
                  {listing.seller?.full_name ?? 'Anonymous'}
                </span>
                <StarRating stars={sellerStats.stars} total={sellerStats.total} showLabel />
              </div>
              <p className="text-xs text-white/50">
                Seller is paid {DEFAULT_HOLD_HOURS}hr after class
              </p>
            </div>
          </div>
        </div>

        {/* Booking confirmation screenshot — only visible to seller or buyer after claiming */}
        {listing.confirmation_screenshot_url && canSeeConfirmation && (
          <div className="border border-white/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs text-white/50 uppercase tracking-widest">
                Booking confirmation
              </h2>
            </div>
            <a
              href={listing.confirmation_screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block w-fit"
              title="Open full size"
            >
              <img
                src={listing.confirmation_screenshot_url}
                alt="Booking confirmation"
                className="rounded-xl border border-white/15 max-h-64 object-contain transition-opacity group-hover:opacity-80"
              />
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/50 group-hover:text-white transition-colors">
                <Maximize2 className="h-3 w-3" />
                Tap to view full size
              </span>
            </a>
          </div>
        )}
        {listing.confirmation_screenshot_url && !canSeeConfirmation && (
          <div className="border border-dashed border-white/20 rounded-xl p-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-white/50" />
            <p className="text-sm text-white/60">
              {userHasClaim
                ? `Booking confirmation unlocks ${CONFIRMATION_RELEASE_HOURS} hours before class starts.`
                : 'Booking confirmation is unlocked after you claim this spot.'}
            </p>
          </div>
        )}

        {/* Studio cancellation policy */}
        {studio && (
          <div className="border border-white/20 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/50 uppercase tracking-widest">
              {studio.name} cancellation policy
            </p>
            <div className="space-y-2 text-sm text-white/60">
              {studio.cancellation_cutoff_label && (
                <p>
                  Free cancellation until{' '}
                  <span className="font-bold text-white">{studio.cancellation_cutoff_label}</span>.
                </p>
              )}
              {studio.cancellation_notes && <p>{studio.cancellation_notes}</p>}
              <p>
                If you don&apos;t show up,{' '}
                <span className="font-bold text-red-500">{cancellationFeeDisplay}</span> goes to the
                seller. The rest comes back to you.
              </p>
            </div>
            <div className="border-t border-white/15 pt-3">
              <p className="text-xs text-white/50 uppercase tracking-widest">Payment type</p>
              <p className="text-white font-bold mt-1">
                {studio.payment_type === 'prepaid' ? 'Prepaid' : 'Pay in person'}
              </p>
            </div>
          </div>
        )}

        {listing.description && (
          <div className="border border-white/20 rounded-xl p-5">
            <h2 className="text-xs text-white/50 uppercase tracking-widest mb-2">
              Notes from seller
            </h2>
            <p className="text-sm text-white/60 whitespace-pre-wrap">{listing.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

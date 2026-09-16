export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditListingForm } from '@/components/listings/EditListingForm'
import type { Listing } from '@/types'

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/listings/${id}/edit`)

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()
  const listing = data as Listing

  // Someone else's listing is simply not theirs to edit.
  if (listing.seller_id !== user.id) redirect(`/listings/${id}`)

  // Once claimed, the details are part of a deal already in motion.
  if (listing.status !== 'available') {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/listings/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listing
        </Link>
        <h1 className="text-2xl font-bold mb-2">Can&apos;t edit this listing</h1>
        <p className="text-muted-foreground">
          {listing.status === 'claimed'
            ? 'Someone has claimed this spot, so the details are locked in.'
            : `This listing is ${listing.status} and can no longer be changed.`}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/listings/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listing
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit listing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {listing.studio_name} — the studio can&apos;t be changed, since its cancellation
          policy is part of the deal.
        </p>
      </div>

      <EditListingForm listing={listing} />
    </div>
  )
}

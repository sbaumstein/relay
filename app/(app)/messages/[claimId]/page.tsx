import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MessageThread } from '@/components/messages/MessageThread'
import type { Message } from '@/types'

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ claimId: string }>
}) {
  const { claimId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirectTo=/messages/${claimId}`)

  // Membership is checked here explicitly rather than leaning on RLS: a
  // non-party must get a 404, not an empty thread.
  const { data: claim } = await supabase
    .from('claims')
    .select('id, claimer_id, seller_id, listing:listings(id, class_name, studio_name)')
    .eq('id', claimId)
    .maybeSingle()

  if (!claim) notFound()
  if (claim.claimer_id !== user.id && claim.seller_id !== user.id) notFound()

  const iAmBuyer = claim.claimer_id === user.id
  const otherId = iAmBuyer ? claim.seller_id : claim.claimer_id

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', otherId)
    .maybeSingle()

  // Never an email address — a neutral role label is the fallback.
  const counterpartyName = otherProfile?.full_name || (iAmBuyer ? 'Seller' : 'Buyer')

  // A missing messages table (migration not yet applied) must not break the
  // page: the thread just starts empty.
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })

  const listing = claim.listing as unknown as
    { id: string; class_name: string | null; studio_name: string | null } | null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/messages"
          className="text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors"
        >
          ← Messages
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">{counterpartyName}</h1>
        {listing && (
          <p className="text-sm text-white/60 mt-1">
            {listing.class_name ?? 'Class'}
            {listing.studio_name ? ` · ${listing.studio_name}` : ''}
          </p>
        )}
        {listing?.id && (
          <Link
            href={`/listings/${listing.id}`}
            className="text-xs text-white/40 hover:text-emerald-400 transition-colors mt-1 inline-block"
          >
            View the listing →
          </Link>
        )}
      </div>

      <MessageThread
        claimId={claimId}
        currentUserId={user.id}
        counterpartyName={counterpartyName}
        initialMessages={(error ? [] : (messages ?? [])) as Message[]}
        loadFailed={!!error}
      />
    </div>
  )
}

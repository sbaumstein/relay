import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MessageThread } from '@/components/messages/MessageThread'
import type { Message } from '@/types'
import {
  claimLabelMap,
  counterpartyLabel,
  loadSharedClaims,
  pickSendClaim,
} from '../conversations'

/**
 * One conversation per PERSON: every message on every claim the two of us
 * share, in one chronological history.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId: otherId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirectTo=/messages/${otherId}`)
  if (otherId === user.id) notFound()

  // The not-a-party check, done explicitly here rather than leaning on RLS:
  // without at least one claim shared with this person there is no
  // conversation to show, so it is a 404 — not an empty thread.
  const sharedClaims = await loadSharedClaims(supabase, user.id, otherId)
  if (sharedClaims.length === 0) notFound()

  const claimIds = sharedClaims.map((c) => c.id)
  const newest = sharedClaims[0]

  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', otherId)
    .maybeSingle()

  // Never an email address — a neutral role label is the fallback.
  const counterpartyName = counterpartyLabel(otherProfile?.full_name, newest.iAmBuyer)

  // Which claim a new message attaches to is resolved here, server-side; the
  // client never gets to choose a claim id.
  // Null once every shared claim has settled: the thread stays readable, but
  // there is no live claim to attach a new message to.
  const sendClaim = pickSendClaim(sharedClaims)

  // A missing messages table (migration not yet applied) must not break the
  // page: the conversation just starts empty.
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
    .in('claim_id', claimIds)
    .order('created_at', { ascending: true })

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
        <p className="text-sm text-white/60 mt-1">
          {sharedClaims.length === 1
            ? newest.className + (newest.studioName ? ` · ${newest.studioName}` : '')
            : `${sharedClaims.length} classes together`}
        </p>
      </div>

      <MessageThread
        otherUserId={otherId}
        sendClaimId={sendClaim?.id ?? null}
        currentUserId={user.id}
        counterpartyName={counterpartyName}
        initialMessages={(error ? [] : (messages ?? [])) as Message[]}
        claimLabels={claimLabelMap(sharedClaims)}
        loadFailed={!!error}
      />
    </div>
  )
}

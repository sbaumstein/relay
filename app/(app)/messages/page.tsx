import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { shortDateTimeLabel } from '@/lib/datetime'
import {
  counterpartyLabel,
  loadCounterpartyNames,
  loadMyClaims,
} from './conversations'

/**
 * One row per PERSON, not per claim. A conversation with X is every message on
 * every claim where {me, X} are the two parties — grouped here, in the
 * application layer, with messages.claim_id left exactly as it is.
 */

type Conversation = {
  otherId: string
  counterpartyName: string
  /** The class the most recent message concerns, for a bit of context. */
  contextLabel: string
  preview: string | null
  lastAt: string
  unread: number
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages')

  const claims = await loadMyClaims(supabase, user.id)
  const claimIds = claims.map((c) => c.id)
  const claimById = new Map(claims.map((c) => [c.id, c]))

  // The messages table may not exist yet in a given environment, so a failure
  // here degrades to "no previews / no badges" instead of a 500.
  let messageRows: {
    claim_id: string
    body: string
    created_at: string
    sender_id: string
    read_at: string | null
  }[] = []
  if (claimIds.length > 0) {
    const { data, error } = await supabase
      .from('messages')
      .select('claim_id, body, created_at, sender_id, read_at')
      .in('claim_id', claimIds)
      .order('created_at', { ascending: true })
    if (!error && data) messageRows = data
  }

  // Counterparty names only — never an email address.
  const otherIds = [...new Set(claims.map((c) => c.otherId))]
  const names = await loadCounterpartyNames(supabase, otherIds)

  // Fold every message into its counterparty's bucket.
  const lastByPerson = new Map<string, { body: string; created_at: string; claim_id: string }>()
  const unreadByPerson = new Map<string, number>()
  for (const m of messageRows) {
    const claim = claimById.get(m.claim_id)
    if (!claim) continue
    // rows arrive oldest-first, so the final write per person is the latest.
    lastByPerson.set(claim.otherId, {
      body: m.body,
      created_at: m.created_at,
      claim_id: m.claim_id,
    })
    if (m.sender_id !== user.id && m.read_at === null) {
      unreadByPerson.set(claim.otherId, (unreadByPerson.get(claim.otherId) ?? 0) + 1)
    }
  }

  // A shared claim on its own is not a conversation — the inbox lists only
  // people someone has actually written to. New ones start from "+".
  const conversations: Conversation[] = otherIds
    .filter((otherId) => lastByPerson.has(otherId))
    .map((otherId) => {
      // claims is newest-first, so this is the latest claim with this person.
      const newest = claims.find((c) => c.otherId === otherId)!
      const last = lastByPerson.get(otherId)
      const contextClaim = (last && claimById.get(last.claim_id)) || newest
      return {
        otherId,
        counterpartyName: counterpartyLabel(names.get(otherId), newest.iAmBuyer),
        contextLabel:
          contextClaim.className +
          (contextClaim.studioName ? ` · ${contextClaim.studioName}` : ''),
        preview: last?.body ?? null,
        lastAt: last?.created_at ?? newest.createdAt,
        unread: unreadByPerson.get(otherId) ?? 0,
      }
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Inbox</p>
          <h1 className="text-3xl font-bold text-white">Messages</h1>
        </div>
        <Link
          href="/messages/new"
          aria-label="New message"
          title="New message"
          className="flex-shrink-0 h-11 w-11 rounded-xl bg-white text-neutral-900 flex items-center justify-center hover:bg-emerald-400 transition-colors"
        >
          <Plus className="h-5 w-5" strokeWidth={2.25} />
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="border border-white/20 rounded-xl p-8 text-center">
          <p className="text-white font-semibold">No messages yet</p>
          <p className="text-sm text-white/60 mt-2">
            Start one with + above — you can message anyone whose spot you&apos;ve
            claimed, or who claimed yours.
          </p>
        </div>
      ) : (
        <div className="border-t border-white/20">
          {conversations.map((c) => (
            <Link
              key={c.otherId}
              href={`/messages/${c.otherId}`}
              className="flex items-start gap-3 py-4 px-1 border-b border-white/20 hover:bg-white/6 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{c.counterpartyName}</p>
                  {c.unread > 0 && (
                    <span className="flex-shrink-0 text-[10px] font-bold text-neutral-900 bg-emerald-400 rounded-full px-1.5 py-0.5 leading-none">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 truncate mt-0.5">{c.contextLabel}</p>
                <p className={`text-sm truncate mt-1.5 ${c.unread > 0 ? 'text-white' : 'text-white/50'}`}>
                  {c.preview}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-white/40 whitespace-nowrap">
                  {shortDateTimeLabel(c.lastAt)}
                </span>
                <span className="text-white/40 group-hover:text-white/75 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

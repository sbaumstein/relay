import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { shortDateTimeLabel } from '@/lib/datetime'

/**
 * A claim IS a thread: it pairs exactly one buyer (claimer_id) with one seller
 * (seller_id). So the threads list is just "every claim I am a party to",
 * ordered by its most recent message.
 */

type ClaimRow = {
  id: string
  claimer_id: string
  seller_id: string
  created_at: string
  listing?: { class_name: string | null; studio_name: string | null } | null
}

type Thread = {
  claimId: string
  counterpartyName: string
  className: string
  studioName: string
  preview: string | null
  lastAt: string
  unread: number
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages')

  // claims has split per-side SELECT policies, so each side is read on its own
  // rather than with a single OR that one policy might not cover.
  const claimSelect = 'id, claimer_id, seller_id, created_at, listing:listings(class_name, studio_name)'
  const [{ data: asBuyer }, { data: asSeller }] = await Promise.all([
    supabase.from('claims').select(claimSelect).eq('claimer_id', user.id),
    supabase.from('claims').select(claimSelect).eq('seller_id', user.id),
  ])

  const byId = new Map<string, ClaimRow>()
  for (const row of [...(asBuyer ?? []), ...(asSeller ?? [])] as unknown as ClaimRow[]) {
    byId.set(row.id, row)
  }
  const claims = [...byId.values()]
  const claimIds = claims.map((c) => c.id)

  // The messages table may not exist yet in a given environment, so a failure
  // here degrades to "no previews / no badges" instead of a 500.
  let messageRows: { claim_id: string; body: string; created_at: string; sender_id: string; read_at: string | null }[] = []
  if (claimIds.length > 0) {
    const { data, error } = await supabase
      .from('messages')
      .select('claim_id, body, created_at, sender_id, read_at')
      .in('claim_id', claimIds)
      .order('created_at', { ascending: true })
    if (!error && data) messageRows = data
  }

  // Counterparty names only — never an email address.
  const otherIds = [...new Set(
    claims.map((c) => (c.claimer_id === user.id ? c.seller_id : c.claimer_id))
  )]
  let names = new Map<string, string | null>()
  if (otherIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', otherIds)
    names = new Map((data ?? []).map((p) => [p.id, p.full_name]))
  }

  const lastByClaim = new Map<string, { body: string; created_at: string }>()
  const unreadByClaim = new Map<string, number>()
  for (const m of messageRows) {
    // rows arrive oldest-first, so the final write per claim is the latest.
    lastByClaim.set(m.claim_id, { body: m.body, created_at: m.created_at })
    if (m.sender_id !== user.id && m.read_at === null) {
      unreadByClaim.set(m.claim_id, (unreadByClaim.get(m.claim_id) ?? 0) + 1)
    }
  }

  const threads: Thread[] = claims
    .map((c) => {
      const iAmBuyer = c.claimer_id === user.id
      const otherId = iAmBuyer ? c.seller_id : c.claimer_id
      const last = lastByClaim.get(c.id)
      return {
        claimId: c.id,
        counterpartyName: names.get(otherId) || (iAmBuyer ? 'Seller' : 'Buyer'),
        className: c.listing?.class_name ?? 'Class',
        studioName: c.listing?.studio_name ?? '',
        preview: last?.body ?? null,
        lastAt: last?.created_at ?? c.created_at,
        unread: unreadByClaim.get(c.id) ?? 0,
      }
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Inbox</p>
        <h1 className="text-3xl font-bold text-white">Messages</h1>
      </div>

      {threads.length === 0 ? (
        <div className="border border-white/20 rounded-xl p-8 text-center">
          <p className="text-white font-semibold">No messages yet</p>
          <p className="text-sm text-white/60 mt-2">
            Once you claim a spot or sell one of yours, you&apos;ll be able to message the
            other person right here.
          </p>
        </div>
      ) : (
        <div className="border-t border-white/20">
          {threads.map((t) => (
            <Link
              key={t.claimId}
              href={`/messages/${t.claimId}`}
              className="flex items-start gap-3 py-4 px-1 border-b border-white/20 hover:bg-white/6 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{t.counterpartyName}</p>
                  {t.unread > 0 && (
                    <span className="flex-shrink-0 text-[10px] font-bold text-neutral-900 bg-emerald-400 rounded-full px-1.5 py-0.5 leading-none">
                      {t.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 truncate mt-0.5">
                  {t.className}{t.studioName ? ` · ${t.studioName}` : ''}
                </p>
                <p className={`text-sm truncate mt-1.5 ${t.unread > 0 ? 'text-white' : 'text-white/50'}`}>
                  {t.preview ?? 'No messages yet — say hello'}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-white/40 whitespace-nowrap">
                  {shortDateTimeLabel(t.lastAt)}
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

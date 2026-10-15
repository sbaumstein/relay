import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { shortDateTimeLabel } from '@/lib/datetime'
import {
  counterpartyLabel,
  isActiveClaim,
  loadCounterpartyNames,
  loadMyClaims,
} from '../conversations'

/**
 * The "New message" picker: a plain page, not a modal — components/ui/dialog
 * was removed from this project on purpose. It lists the active claims and
 * each one links through to that person's conversation.
 *
 * This static /messages/new segment takes precedence over the /messages/[userId]
 * dynamic segment, so it never collides with a real conversation route.
 */
export default async function NewMessagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages/new')

  const claims = (await loadMyClaims(supabase, user.id)).filter((c) => isActiveClaim(c.status))
  const names = await loadCounterpartyNames(
    supabase,
    [...new Set(claims.map((c) => c.otherId))]
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/messages"
          className="text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors"
        >
          ← Messages
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">New message</h1>
        <p className="text-sm text-white/60 mt-1">
          Pick one of your active classes to message the other person about it.
        </p>
      </div>

      {claims.length === 0 ? (
        <div className="border border-white/20 rounded-xl p-8 text-center">
          <p className="text-white font-semibold">Nothing active right now</p>
          <p className="text-sm text-white/60 mt-2">
            You can message someone once you&apos;ve claimed one of their spots, or
            someone has claimed one of yours.
          </p>
        </div>
      ) : (
        <div className="border-t border-white/20">
          {claims.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.otherId}`}
              className="flex items-start gap-3 py-4 px-1 border-b border-white/20 hover:bg-white/6 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{c.className}</p>
                <p className="text-xs text-white/60 truncate mt-0.5">
                  {c.studioName}
                  {c.studioName && c.classDatetime ? ' · ' : ''}
                  {c.classDatetime ? shortDateTimeLabel(c.classDatetime) : ''}
                </p>
                <p className="text-sm text-white/50 truncate mt-1.5">
                  {counterpartyLabel(names.get(c.otherId), c.iAmBuyer)}
                </p>
              </div>
              <span className="flex-shrink-0 pt-0.5 text-white/40 group-hover:text-white/75 transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

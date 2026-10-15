import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/messages/ConversationList'
import { loadConversations } from './conversations'

/**
 * One row per PERSON, not per claim. A conversation with X is every message on
 * every claim where {me, X} are the two parties — grouped in the application
 * layer, with messages.claim_id left exactly as it is.
 *
 * Only live conversations are here. Once every shared claim settles the
 * conversation moves to the archive, which is a click away rather than in the
 * way.
 */
export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages')

  const { active, archived } = await loadConversations(supabase, user.id)

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

      {active.length === 0 ? (
        <div className="border border-white/20 rounded-xl p-8 text-center">
          <p className="text-white font-semibold">No messages yet</p>
          <p className="text-sm text-white/60 mt-2">
            Start one with + above — you can message anyone whose spot you&apos;ve
            claimed, or who claimed yours.
          </p>
        </div>
      ) : (
        <ConversationList conversations={active} />
      )}

      {archived.length > 0 && (
        <Link
          href="/messages/archived"
          className="mt-6 flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          <Archive className="h-3.5 w-3.5" />
          Archived ({archived.length})
        </Link>
      )}
    </div>
  )
}

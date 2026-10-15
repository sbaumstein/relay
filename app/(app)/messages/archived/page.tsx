export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ConversationList } from '@/components/messages/ConversationList'
import { loadConversations } from '../conversations'

/**
 * Conversations whose shared claims have all settled. Readable, but closed —
 * the thread itself hides its composer once there is nothing live to discuss.
 */
export default async function ArchivedMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/messages/archived')

  const { archived } = await loadConversations(supabase, user.id)

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white uppercase tracking-widest mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Messages
      </Link>

      <div className="mb-8">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Archive</p>
        <h1 className="text-3xl font-bold text-white">Past conversations</h1>
        <p className="text-sm text-white/60 mt-1.5">
          Classes you and the other person have both finished with.
        </p>
      </div>

      {archived.length === 0 ? (
        <div className="border border-white/20 rounded-xl p-8 text-center">
          <p className="text-white font-semibold">Nothing archived yet</p>
          <p className="text-sm text-white/60 mt-2">
            Conversations move here once every spot you shared has settled.
          </p>
        </div>
      ) : (
        <ConversationList conversations={archived} />
      )}
    </div>
  )
}

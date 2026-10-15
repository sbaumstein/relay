import Link from 'next/link'
import { shortDateTimeLabel } from '@/lib/datetime'
import type { Conversation } from '@/app/(app)/messages/conversations'

/** Shared by the inbox and the archive, so the two can't drift apart. */
export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  return (
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
  )
}

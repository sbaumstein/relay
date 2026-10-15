import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface HistorySectionProps {
  title: string
  /** Label on the history link, e.g. "Previous listings". */
  historyLabel: string
  historyCount: number
  /** Page the history link points at. */
  historyHref: string
  children: ReactNode
}

/**
 * A profile section whose settled history lives on its own page, so this page
 * leads with what still needs attention.
 */
export function HistorySection({
  title,
  historyLabel,
  historyCount,
  historyHref,
  children,
}: HistorySectionProps) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-white/60 uppercase tracking-widest">{title}</p>
        {historyCount > 0 && (
          <Link
            href={historyHref}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            {historyLabel} ({historyCount})
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {children}
    </div>
  )
}

/**
 * Shared shell for the two history pages: heading plus a way back to the
 * profile.
 */
export function HistoryPageLayout({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to profile
      </Link>

      <div className="mb-8">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-1">History</p>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
      </div>

      {count === 0 ? (
        <p className="text-white/60 text-sm py-8 text-center border border-white/20 rounded-xl">
          Nothing here yet
        </p>
      ) : (
        <div className="border-t border-white/15">{children}</div>
      )}
    </div>
  )
}

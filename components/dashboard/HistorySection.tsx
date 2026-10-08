'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface HistorySectionProps {
  title: string
  /** Label on the disclosure, e.g. "Previous listings". */
  historyLabel: string
  historyCount: number
  /** Settled rows, revealed under the active ones. */
  history: ReactNode
  children: ReactNode
}

/**
 * A profile section with its settled history tucked behind an arrow, so the
 * page leads with what still needs attention.
 */
export function HistorySection({
  title,
  historyLabel,
  historyCount,
  history,
  children,
}: HistorySectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs text-white/60 uppercase tracking-widest">{title}</p>
        {historyCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors flex-shrink-0"
          >
            {historyLabel} ({historyCount})
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </div>

      {children}

      {open && <div className="mt-6 opacity-60">{history}</div>}
    </div>
  )
}

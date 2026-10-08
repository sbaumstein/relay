'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

const STEPS = [
  'Open relay in Safari, then tap the Share button at the bottom of the screen — the square with an arrow pointing up.',
  'Scroll down the share menu and tap "Add to Home Screen".',
  'Tap "Add". Relay now opens from your home screen like any other app.',
]

export function AddToHomeScreen() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-10 w-full max-w-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 mx-auto text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors"
      >
        Download as app
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <ol className="mt-5 space-y-3 text-left">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex-shrink-0 h-5 w-5 border border-white/30 text-[10px] flex items-center justify-center text-white/70">
                {i + 1}
              </span>
              <p className="text-sm text-white/60 leading-snug">{step}</p>
            </li>
          ))}
          <li className="text-xs text-white/35 pt-1">
            On Android, open the browser menu and tap &quot;Install app&quot;.
          </li>
        </ol>
      )}
    </div>
  )
}

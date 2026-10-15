'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Compass, MessageCircle, User, LogOut, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface BottomNavProps {
  user: Profile | null
}

/** Height of the bar itself, before the phone's home-indicator inset. */
export const BOTTOM_NAV_HEIGHT = 64

export function BottomNav({ user }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 text-[10px] tracking-wide transition-colors ${
      active ? 'text-white' : 'text-white/55 hover:text-white'
    }`

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-white/15 backdrop-blur-md bg-surface/95"
      // Clear the home indicator on phones rather than sitting under it.
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative max-w-2xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-5 sm:gap-7">
          <Link href="/browse" className={itemClass(pathname === '/browse')}>
            <Compass className="h-5 w-5" />
            Browse
          </Link>

          {user && (
            <Link href="/messages" className={itemClass(pathname.startsWith('/messages'))}>
              <MessageCircle className="h-5 w-5" />
              Messages
            </Link>
          )}
        </div>

        {/* Centred independently of the side items, so it stays put whether
            the right side shows two links or one. */}
        <Link
          href="/listings/new"
          aria-label="Post a spot"
          className="absolute left-1/2 -translate-x-1/2 -top-5 h-14 w-14 rounded-2xl bg-white text-neutral-900 shadow-lg flex items-center justify-center hover:bg-emerald-400 hover:scale-105 transition-all"
        >
          <Plus className="h-7 w-7" strokeWidth={2.25} />
        </Link>

        {user ? (
          <div className="flex items-center gap-5 sm:gap-7">
            <Link href="/dashboard" className={itemClass(pathname === '/dashboard')}>
              <User className="h-5 w-5" />
              Profile
            </Link>
            <button onClick={handleSignOut} className={itemClass(false)}>
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-5 sm:gap-7">
            <Link href="/login" className={itemClass(pathname === '/login')}>
              <User className="h-5 w-5" />
              Sign in
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

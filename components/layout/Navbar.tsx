'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface NavbarProps {
  user: Profile | null
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-10 border-b border-white/20 backdrop-blur-md" style={{ background: 'rgba(20,20,20,0.94)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/browse" className="text-base sm:text-lg font-bold tracking-widest uppercase text-white">
          Relay
        </Link>

        <div className="flex items-center gap-5 sm:gap-8">
          <Link
            href="/browse"
            className={`text-sm tracking-wide transition-colors ${pathname === '/browse' ? 'text-white' : 'text-white/75 hover:text-white'}`}
          >
            Browse
          </Link>

          {user && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm tracking-wide transition-colors ${pathname === '/dashboard' ? 'text-white' : 'text-white/75 hover:text-white'}`}
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm tracking-wide text-white/75 hover:text-white transition-colors hidden sm:block"
              >
                Sign out
              </button>
            </>
          )}

          {!user && (
            <>
              <Link href="/login" className="text-sm tracking-wide text-white/75 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm tracking-wide border border-white/40 hover:border-white px-3 sm:px-4 py-1.5 text-white transition-colors"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dumbbell } from 'lucide-react'
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
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/browse" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-5 w-5" />
          Workout Exchange
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/browse"
            className={`text-sm ${pathname === '/browse' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Browse
          </Link>

          {user && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${pathname === '/dashboard' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Profile
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          )}

          {!user && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

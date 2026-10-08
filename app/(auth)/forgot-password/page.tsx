'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass = 'text-xs text-white/50 uppercase tracking-widest'
const inputClass =
  'bg-white/5 border-white/20 rounded-none h-11 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-0'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a1a1a] text-white">
      <a href="/" className="text-xl font-bold uppercase tracking-widest mb-8">Relay</a>
      <div className="w-full max-w-md border border-white/20 rounded-xl p-5">
        {sent ? (
          <>
            <p className="text-xs text-emerald-400 uppercase tracking-widest">Link sent</p>
            <h1 className="text-2xl font-semibold mt-2">Check your email</h1>
            <p className="text-sm text-white/60 mt-2">
              We&apos;ve sent a password reset link. It may take a minute to arrive.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-xs text-white/50 uppercase tracking-widest hover:text-white transition-colors"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className={labelClass}>Account recovery</p>
            <h1 className="text-2xl font-semibold mt-2">Forgot password</h1>
            <p className="text-sm text-white/60 mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 mt-7">
              <div className="space-y-2">
                <Label htmlFor="email" className={labelClass}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold py-3 text-sm uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-white/50 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

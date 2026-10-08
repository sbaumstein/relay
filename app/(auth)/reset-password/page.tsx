'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass = 'text-xs text-white/50 uppercase tracking-widest'
const inputClass =
  'bg-white/5 border-white/20 rounded-lg h-11 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-0'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated!')
    router.push('/browse')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a1a1a] text-white">
      <a href="/" className="text-xl font-bold uppercase tracking-widest mb-8">Relay</a>
      <div className="w-full max-w-md border border-white/20 rounded-xl p-5">
        <p className={labelClass}>Account recovery</p>
        <h1 className="text-2xl font-semibold mt-2">Set new password</h1>
        <p className="text-sm text-white/60 mt-1">At least 6 characters.</p>

        <form onSubmit={handleSubmit} className="space-y-5 mt-7">
          <div className="space-y-2">
            <Label htmlFor="password" className={labelClass}>New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className={labelClass}>Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg py-3 text-sm uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

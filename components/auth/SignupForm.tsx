'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

const labelClass = 'text-xs text-white/50 uppercase tracking-widest'
const inputClass =
  'bg-white/5 border-white/20 rounded-lg h-11 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-0'

export function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto border border-white/20 rounded-xl p-5 text-white">
        <p className="text-xs text-emerald-400 uppercase tracking-widest">Almost there</p>
        <h1 className="text-2xl font-semibold mt-2">Check your email</h1>
        <p className="text-sm text-white/60 mt-2">
          We&apos;ve sent a confirmation link to your email address. Click it to activate your
          account.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto border border-white/20 rounded-xl p-5 text-white">
      <p className={labelClass}>Join Relay</p>
      <h1 className="text-2xl font-semibold mt-2">Create an account</h1>
      <p className="text-sm text-white/60 mt-1">
        Pass on a spot you can&apos;t use, or pick up one someone else can&apos;t.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-7">
        <div className="space-y-2">
          <Label htmlFor="full_name" className={labelClass}>Full name</Label>
          <Input
            id="full_name"
            placeholder="Jane Smith"
            className={inputClass}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className={inputClass}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={labelClass}>Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className={inputClass}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-neutral-900 font-semibold rounded-lg py-3 text-sm uppercase tracking-widest hover:bg-emerald-400 transition-colors transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-white/50 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

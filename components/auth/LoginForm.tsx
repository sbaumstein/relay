'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

const labelClass = 'text-xs text-white/50 uppercase tracking-widest'
const inputClass =
  'bg-white/5 border-white/20 rounded-none h-11 text-white placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-0'

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/browse'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (searchParams.get('error') === 'verify_email') {
      toast.error('Please verify your email before signing in. Check your inbox for the confirmation link.')
    }
  }, [searchParams])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const supabase = createClient()
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (!signInData.user.email_confirmed_at) {
      await supabase.auth.signOut()
      toast.error('Please verify your email before signing in. Check your inbox for the confirmation link.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="w-full max-w-md mx-auto border border-white/20 rounded-xl p-5 text-white">
      <p className={labelClass}>Sign in</p>
      <h1 className="text-2xl font-semibold mt-2">Welcome back</h1>
      <p className="text-sm text-white/60 mt-1">Post or claim a spot in seconds.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-7">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className={labelClass}>Password</Label>
            <Link href="/forgot-password" className="text-xs text-white/50 hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>
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
          className="w-full bg-white text-black font-semibold py-3 text-sm uppercase tracking-widest hover:bg-white/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-white/50 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-white hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

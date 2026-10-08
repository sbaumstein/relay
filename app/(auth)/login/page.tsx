import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface text-white">
      <a href="/" className="text-xl font-bold uppercase tracking-widest mb-8">
        Relay
      </a>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}

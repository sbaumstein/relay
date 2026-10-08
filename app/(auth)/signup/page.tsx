import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a1a1a] text-white">
      <a href="/" className="text-xl font-bold uppercase tracking-widest mb-8">
        Relay
      </a>
      <SignupForm />
    </div>
  )
}

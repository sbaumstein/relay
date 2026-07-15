import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <a href="/" className="text-2xl font-bold mb-8">
        Relay
      </a>
      <SignupForm />
    </div>
  )
}

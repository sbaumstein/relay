import Link from 'next/link'
import { VideoBackground } from '@/components/ui/VideoBackground'

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">

      {/* Background video cycling */}
      <VideoBackground />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="text-xl font-bold tracking-widest uppercase">Relay</span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/login" className="text-white/70 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="border border-white/50 hover:border-white px-5 py-2 text-sm transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4 leading-none">
          Can&apos;t make it<br />to class?
        </h1>
        <p className="text-lg sm:text-xl text-white/60 mb-12 max-w-md">
          Pass your spot to someone who can.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/browse"
            className="w-48 text-center bg-white text-black font-semibold py-3 px-8 hover:bg-white/90 transition-colors text-sm uppercase tracking-widest"
          >
            Browse Spots
          </Link>
          <Link
            href="/signup"
            className="w-48 text-center border border-white/50 hover:border-white font-semibold py-3 px-8 transition-colors text-sm uppercase tracking-widest"
          >
            Post a Spot
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-white/30 text-xs pb-6 tracking-widest uppercase">
        © {new Date().getFullYear()} Relay
      </div>
    </div>
  )
}

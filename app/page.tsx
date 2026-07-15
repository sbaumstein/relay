import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dumbbell, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Dumbbell className="h-5 w-5" />
            Relay
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Can&apos;t make it to class?
          <br />
          <span className="text-blue-600">Someone else can.</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Relay lets you list your pre-booked fitness class so someone else can take your
          spot. Avoid late cancellation fees. Help others get into sold-out classes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/browse">
              Browse class spots
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Post a spot</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Post your spot',
                description:
                  "Can't attend your booked class? List it with the studio, time, and price you paid.",
              },
              {
                step: '2',
                title: 'Someone claims it',
                description:
                  'Another member sees your listing and claims it. For paid classes, they pay you directly through Stripe.',
              },
              {
                step: '3',
                title: 'Everyone wins',
                description:
                  "You avoid a cancellation fee. They get into a class they wanted. It's that simple.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to swap a class?</h2>
          <p className="text-blue-100 mb-8">
            Join and start browsing available class spots in your city.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">
              Create your account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Relay. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

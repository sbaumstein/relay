import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCents } from '@/lib/stripe/helpers'
import { CLASS_TYPE_COLORS, CLASS_TYPES, getSellerStats } from '@/types'
import { StarRating } from '@/components/ui/StarRating'
import type { Listing, Claim, Profile } from '@/types'
import { Plus, ShieldCheck } from 'lucide-react'
import { CheckInCard } from '@/components/claims/CheckInCard'

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    available:            'bg-emerald-100 text-emerald-800',
    claimed:              'bg-blue-100 text-blue-800',
    expired:              'bg-gray-100 text-gray-600',
    cancelled:            'bg-red-100 text-red-700',
    pending_confirmation: 'bg-yellow-100 text-yellow-800',
    disputed:             'bg-red-100 text-red-700',
    needs_review:         'bg-orange-100 text-orange-700',
    auto_released:        'bg-blue-100 text-blue-800',
    completed:            'bg-blue-100 text-blue-800',
    pending_payment:      'bg-yellow-100 text-yellow-800',
    refunded:             'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${variants[status] ?? 'bg-gray-100'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/dashboard')

  const [{ data: profile }, { data: myListings }, { data: myClaims }, { data: sellerClaims }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('claims').select('*, listing:listings(*, duration_minutes)').eq('claimer_id', user.id).order('created_at', { ascending: false }),
    supabase.from('claims').select('status').eq('seller_id', user.id),
  ])

  const p = profile as Profile | null
  const sellerTotal = sellerClaims?.length ?? 0
  const sellerCompleted = sellerClaims?.filter(
    (c) => c.status === 'completed' || c.status === 'auto_released'
  ).length ?? 0
  const sellerStats = getSellerStats(sellerTotal, sellerCompleted)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-0.5">
          Welcome back, {p?.full_name ?? user.email}
        </p>
      </div>

      {/* Reputation card */}
      <Card className="mb-6">
        <CardContent className="py-4 flex items-center gap-4">
          <ShieldCheck className="h-8 w-8 text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Seller reputation</p>
            <StarRating stars={sellerStats.stars} total={sellerStats.total} showLabel />
            <p className="text-sm text-muted-foreground mt-1">
              {sellerStats.total < 5
                ? `Complete ${5 - sellerStats.total} more transfer${5 - sellerStats.total !== 1 ? 's' : ''} to unlock your star rating.`
                : `${sellerStats.rate}% completion rate · escrow holds ${sellerStats.holdHours}hr after class`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="posted">
        <TabsList className="mb-6">
          <TabsTrigger value="posted">My listings ({myListings?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="claimed">Claimed ({myClaims?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="posted">
          {!myListings || myListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>You haven&apos;t posted any listings yet.</p>
              <Button asChild className="mt-4"><Link href="/listings/new">Post your first spot</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => {
                const l = listing as Listing
                const classDate = new Date(l.class_datetime)
                const colorClass = CLASS_TYPE_COLORS[l.class_type]
                const typeLabel = CLASS_TYPES.find((t) => t.value === l.class_type)?.label
                return (
                  <Card key={l.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>{typeLabel}</span>
                            <StatusBadge status={l.status} />
                          </div>
                          <p className="font-medium truncate">{l.class_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{l.studio_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            at {classDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold">{formatCents(l.price_cents)}</p>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/listings/${l.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="claimed">
          {!myClaims || myClaims.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>You haven&apos;t claimed any class spots yet.</p>
              <Button asChild className="mt-4"><Link href="/browse">Browse available spots</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myClaims.map((claim) => {
                const c = claim as Claim
                const l = c.listing as Listing & { duration_minutes?: number } | undefined
                if (!l) return null
                const classDate = new Date(l.class_datetime)
                const classEnd = new Date(classDate.getTime() + (l.duration_minutes ?? 60) * 60 * 1000)
                const now = new Date()
                const isPending = c.status === 'pending_confirmation'
                const classInFuture = classDate > now
                const needsCheckin = isPending && classEnd < now && !classInFuture
                return (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={c.status} />
                          </div>
                          <p className="font-medium truncate">{l.class_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{l.studio_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {classDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            at {classDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {isPending && classInFuture && (
                            <Link
                              href={`/claims/${c.id}/dispute`}
                              className="text-xs text-red-500 hover:underline mt-1 inline-block"
                            >
                              File a dispute
                            </Link>
                          )}
                          {needsCheckin && (
                            <CheckInCard claimId={c.id} className={l.class_name} />
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold">{formatCents(c.amount_cents)}</p>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/listings/${l.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating action button */}
      <Link
        href="/listings/new"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Flag, MapPin, Phone, ShoppingCart, Sprout, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import ReportDialog from '@/components/dashboard/ReportDialog'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function EmptyStockIllustration() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden>
      <ellipse cx="55" cy="92" rx="34" ry="5" fill="hsl(106 22% 45% / 0.12)" />
      <path d="M55 78V44" stroke="hsl(106 22% 45%)" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 54C55 54 40 49 37 34C50 34 55 54 55 54Z" fill="hsl(106 22% 60%)" />
      <path d="M55 46C55 46 70 42 73 27C60 28 55 46 55 46Z" fill="hsl(106 22% 55%)" />
      <rect x="42" y="76" width="26" height="16" rx="3" fill="hsl(38 48% 68% / 0.35)" stroke="hsl(106 22% 45%)" strokeWidth="2" />
    </svg>
  )
}

export default function NurseryDetailClient({ nurseryId }) {
  const [profile, setProfile] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    proxy(`/nurseries/${nurseryId}`)
      .then(setProfile)
      .catch((err) => toast.error(err.message || 'Could not load this nursery.'))
  }, [nurseryId])

  const addToCart = async (item) => {
    setAddingId(item.id)
    try {
      await proxy('/cart/items', { method: 'POST', body: { stockId: item.id, quantity: 1 } })
      toast.success(`Added ${item.species} to your cart.`)
    } catch (err) {
      toast.error(err.message || 'Could not add to cart.')
    } finally {
      setAddingId(null)
    }
  }

  if (!profile) {
    return (
      <DashboardPageShell className="max-w-3xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="max-w-3xl">
      <Link href="/dashboard/individual/nurseries" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Nurseries
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
        <div className="relative aspect-[21/9] bg-gradient-to-br from-primary/20 to-sand/25">
          {profile.coverPhotoUrl ? (
            <img src={resolveMediaUrl(profile.coverPhotoUrl)} alt={profile.nurseryName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-6xl">🌿</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-white">{profile.nurseryName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85">
                {profile.city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.city}</span>
                )}
                {Number(profile.reviewCount) > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> {Number(profile.avgRating).toFixed(1)} ({profile.reviewCount})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild variant="secondary" className="rounded-full shadow">
                <Link href="/dashboard/individual/orders/cart">
                  <ShoppingCart className="h-4 w-4" /> Cart
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full bg-black/20 text-white hover:bg-black/30 hover:text-white" onClick={() => setReportOpen(true)}>
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.description}</p>
          {profile.contactPhone && (
            <a href={`tel:${profile.contactPhone}`} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> {profile.contactPhone}
            </a>
          )}
        </div>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="nursery" targetId={nurseryId} targetLabel={profile.nurseryName} />

      <div>
        <p className="eyebrow mb-4">Available saplings</p>
        {profile.stock.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
            <EmptyStockIllustration />
            <p className="mt-3 text-sm text-muted-foreground">No stock right now – check back later.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.stock.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
                <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-primary/10 grid place-items-center">
                  {item.photoUrl ? (
                    <img src={resolveMediaUrl(item.photoUrl)} alt={item.species} className="h-full w-full object-cover" />
                  ) : (
                    <Sprout className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.species}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.quantity} available · {item.isFree ? 'Free – request in the mobile app' : formatRupees(item.priceCents)}
                  </p>
                  {!item.isFree && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2.5 rounded-full"
                      disabled={item.quantity < 1 || addingId === item.id}
                      onClick={() => addToCart(item)}
                    >
                      {item.quantity < 1 ? 'Out of stock' : addingId === item.id ? 'Adding…' : 'Add to cart'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MapPin, Star, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

function GreenhouseIllustration() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden>
      <ellipse cx="64" cy="108" rx="42" ry="6" fill="hsl(106 22% 45% / 0.12)" />
      <path d="M22 100V54L64 26L106 54V100H22Z" fill="hsl(38 48% 68% / 0.25)" stroke="hsl(106 22% 45%)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 54L64 26L106 54" stroke="hsl(106 22% 45%)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <path d="M64 26V100" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.4" />
      <path d="M22 54H106" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.4" />
      <rect x="52" y="76" width="24" height="24" rx="2" fill="hsl(152 42% 14% / 0.15)" stroke="hsl(106 22% 45%)" strokeWidth="2" />
      <path d="M44 92C44 92 40 82 46 74C52 82 44 92 44 92Z" fill="hsl(106 22% 60%)" />
      <path d="M84 92C84 92 88 82 82 74C76 82 84 92 84 92Z" fill="hsl(106 22% 55%)" />
    </svg>
  )
}

function RatingStars({ rating }) {
  const r = Math.round(Number(rating) || 0)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < r ? 'fill-primary text-primary' : 'text-border'}`} />
      ))}
    </div>
  )
}

export default function NurseriesClient() {
  const [nurseries, setNurseries] = useState(null)

  useEffect(() => {
    proxy('/nurseries')
      .then((data) => setNurseries(data.nurseries))
      .catch((err) => {
        setNurseries([])
        toast.error(err.message || 'Could not load nurseries.')
      })
  }, [])

  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Marketplace</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Buy saplings from nurseries near you.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg">Verified nurseries in Pune, ready to deliver.</p>
      </div>

      {nurseries === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      ) : nurseries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
          <GreenhouseIllustration />
          <p className="mt-4 text-sm text-muted-foreground">No nurseries listed yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {nurseries.map((n) => (
            <Link
              key={n.id}
              href={`/dashboard/individual/nurseries/${n.id}`}
              className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/15 to-sand/25">
                {n.logoUrl ? (
                  <img src={n.logoUrl} alt={n.nurseryName} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-5xl">🌿</div>
                )}
                {n.offersDelivery && (
                  <Badge className="absolute top-3 right-3 bg-background/90 text-foreground border-none shadow">
                    <Truck className="h-3 w-3" /> Delivers
                  </Badge>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-serif text-lg">{n.nurseryName}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{n.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {n.city && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {n.city}
                    </span>
                  )}
                  {Number(n.reviewCount) > 0 ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <RatingStars rating={n.avgRating} /> ({n.reviewCount})
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">New</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Users, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '@/lib/memberProxy'

function DriveThumb({ src, alt }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/15 to-sand/20">
        <CalendarDays className="h-10 w-10 text-primary/50" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
    />
  )
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto" aria-hidden>
        <circle cx="60" cy="60" r="58" fill="hsl(38 48% 68% / 0.18)" />
        <rect x="34" y="38" width="52" height="44" rx="7" fill="hsl(42 55% 97%)" stroke="hsl(24 22% 45%)" strokeWidth="3" />
        <path d="M34 52h52" stroke="hsl(24 22% 45%)" strokeWidth="3" />
        <path d="M46 32v12M74 32v12" stroke="hsl(24 22% 45%)" strokeWidth="3" strokeLinecap="round" />
        <path d="M53 68c0 0-6-1-7-8 6-1 7 8 7 8z" fill="hsl(106 22% 58%)" />
        <path d="M53 64c0 0 6-1 7-8-6-1-7 8-7 8z" fill="hsl(106 22% 48%)" />
        <circle cx="70" cy="72" r="2.5" fill="hsl(106 22% 55%)" />
        <circle cx="63" cy="76" r="2" fill="hsl(38 48% 55%)" />
      </svg>
      <p className="mt-4 text-sm text-muted-foreground">No upcoming drives right now — check back soon.</p>
    </div>
  )
}

export default function DrivesClient() {
  const [drives, setDrives] = useState(null)

  useEffect(() => {
    proxy('/drives')
      .then(setDrives)
      .catch((err) => {
        setDrives([])
        toast.error(err.message || 'Could not load drives.')
      })
  }, [])

  return (
    <>
      <div>
        <p className="eyebrow text-primary">Join a drive</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Plant with people who show up.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg">Verified drives run by partner NGOs. Reserve your place.</p>
      </div>

      {drives === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-3xl" />
          ))}
        </div>
      ) : drives.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {drives.map((d) => {
            const cancelled = d.status === 'cancelled'
            return (
              <Link
                key={d.id}
                href={`/dashboard/individual/drives/${d.id}`}
                className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  <DriveThumb src={d.photoUri} alt={d.title} />
                  <span className="absolute top-3 left-3 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">
                    {new Date(d.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {cancelled ? (
                    <Badge variant="destructive" className="absolute top-3 right-3">Cancelled</Badge>
                  ) : d.isRsvped ? (
                    <Badge variant="secondary" className="absolute top-3 right-3">
                      <Check className="h-3 w-3" /> Going
                    </Badge>
                  ) : null}
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-lg">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.ngoName}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[d.address, d.city].filter(Boolean).join(', ') || 'Location TBA'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {d.confirmedCount}
                      {d.capacity != null ? ` / ${d.capacity}` : ''} going
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

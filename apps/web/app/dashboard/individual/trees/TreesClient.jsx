'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Camera, MapPin, Sprout } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

export default function TreesClient() {
  const [trees, setTrees] = useState(null)

  useEffect(() => {
    proxy('/trees').then(setTrees).catch((err) => {
      setTrees([])
      toast.error(err.message || 'Could not load your trees.')
    })
  }, [])

  return (
    <DashboardPageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">My Trees</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">The forest that's yours.</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            Every tree you've planted, with its story, growth, and place on the map.
          </p>
        </div>
        <Link
          href="/plant"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
        >
          <Camera className="h-4 w-4" /> Plant with the app
        </Link>
      </div>

      <div>
        <p className="eyebrow mb-4">{trees?.length ? `${trees.length} tree${trees.length === 1 ? '' : 's'}` : 'Gallery'}</p>
        {trees === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-56 w-full rounded-3xl" />
          </div>
        ) : trees.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
            <Sprout className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              You haven't planted a tree yet. Every tree is verified with a live photo, taken in the ARTH mobile app.
            </p>
            <Link href="/plant" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <Camera className="h-4 w-4" /> How planting works
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trees.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/individual/trees/${t.id}`}
                className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  {t.photoUri ? (
                    <img src={t.photoUri} alt={t.nickname} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-4xl">{t.speciesEmoji || '🌱'}</div>
                  )}
                  {t.growthStage && (
                    <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase tracking-widest text-primary">
                      {t.growthStage}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-lg">{t.nickname}</h3>
                  <p className="text-xs text-muted-foreground italic mt-0.5">{t.species}</p>
                  {t.location && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {t.location}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{Number(t.co2Absorbed ?? 0).toFixed(1)} kg CO₂ absorbed</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

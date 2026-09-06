'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MapPin, Heart, TreePine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '@/lib/memberProxy'

function TreeThumb({ src, alt }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/15 to-sand/20">
        <TreePine className="h-10 w-10 text-primary/50" />
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
        <circle cx="60" cy="60" r="58" fill="hsl(106 22% 69% / 0.14)" />
        <path d="M60 80V54" stroke="hsl(106 22% 40%)" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 60c0 0-14-2-18-14 14-2 18 14 18 14z" fill="hsl(106 22% 58%)" />
        <path d="M60 55c0 0 14-2 18-14-14-2-18 14-18 14z" fill="hsl(106 22% 48%)" />
        <path d="M43 90c0-10 7.5-18 17-18s17 8 17 18" stroke="hsl(38 48% 52%)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M45 80l-4.5 10M75 80l4.5 10" stroke="hsl(38 48% 52%)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className="mt-4 text-sm text-muted-foreground">No trees available for adoption right now — check back soon.</p>
    </div>
  )
}

export default function AdoptionsClient() {
  const [trees, setTrees] = useState(null)

  useEffect(() => {
    proxy('/adoptable-trees')
      .then(setTrees)
      .catch((err) => {
        setTrees([])
        toast.error(err.message || 'Could not load trees.')
      })
  }, [])

  return (
    <>
      <div>
        <p className="eyebrow text-primary">Adopt a tree</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Give a tree a name.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg">
          Adopt a tree an NGO is already caring for, and follow its story as it grows.
        </p>
      </div>

      {trees === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-3xl" />
          ))}
        </div>
      ) : trees.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trees.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/individual/adoptions/${t.id}`}
              className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <TreeThumb src={t.photoUri} alt={t.nickname} />
                {t.isAdopted && (
                  <Badge variant="secondary" className="absolute top-3 right-3">
                    <Heart className="h-3 w-3" /> Adopted
                  </Badge>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-serif text-lg">{t.nickname}</h3>
                <p className="text-xs italic text-muted-foreground mt-0.5">{t.speciesName}</p>
                <p className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {[t.location, t.city].filter(Boolean).join(', ') || 'Location TBA'}
                </p>
                {t.ngoName && <p className="text-xs text-muted-foreground mt-1">{t.ngoName}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

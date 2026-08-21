'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MapPin, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../../proxy'

export default function TreesListClient() {
  const [trees, setTrees] = useState(null)

  useEffect(() => {
    proxy('/adoptable-trees')
      .then(setTrees)
      .catch((err) => toast.error(err.message || 'Could not load trees.'))
  }, [])

  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-primary">Adopt a tree</p>
      <h1 className="font-serif text-3xl md:text-4xl mt-2">Give a tree a name.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Adopt a tree an NGO is caring for, and follow its story.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {trees === null ? (
          <>
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </>
        ) : trees.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">No trees available for adoption right now.</p>
        ) : (
          trees.map((t) => (
            <Link
              key={t.id}
              href={`/app/trees/${t.id}`}
              className="block rounded-3xl border border-border/70 bg-card p-5 transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg">{t.nickname}</h3>
                  <p className="text-xs italic text-muted-foreground mt-0.5">{t.speciesName}</p>
                </div>
                {t.isAdopted && (
                  <Badge variant="secondary" className="shrink-0">
                    <Heart className="h-3 w-3" /> Adopted
                  </Badge>
                )}
              </div>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {[t.location, t.city].filter(Boolean).join(', ') || 'Location TBA'}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

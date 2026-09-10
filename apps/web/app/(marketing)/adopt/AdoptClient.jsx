'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, CalendarDays, Heart, MapPin, ShieldCheck, Sprout, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/site/AuthProvider'
import { proxy } from '@/lib/memberProxy'

const FALLBACK_FOREST_PHOTO = 'https://images.pexels.com/photos/880675/pexels-photo-880675.jpeg'

const TRUST = [
  { icon: ShieldCheck, label: 'Verified by partner NGOs' },
  { icon: Sprout, label: 'Cared for, season after season' },
  { icon: Heart, label: 'Named and followed by you' },
]

function TreeThumb({ src, alt }) {
  const [broken, setBroken] = useState(false)
  return (
    <img
      src={!src || broken ? FALLBACK_FOREST_PHOTO : src}
      alt={alt}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
    />
  )
}

export default function AdoptClient() {
  const { user } = useAuth()
  const [trees, setTrees] = useState(null)

  useEffect(() => {
    proxy('/adoptable-trees')
      .then(setTrees)
      .catch((err) => {
        setTrees([])
        toast.error(err.message || 'Could not load trees.')
      })
  }, [])

  const featured = trees?.find((t) => !t.isAdopted) ?? trees?.[0] ?? null
  const exploreHref = user ? '/dashboard/individual/adoptions' : '/register'
  const adoptedCount = trees?.filter((t) => t.isAdopted).length ?? 0

  return (
    <div className="pt-24 md:pt-28 pb-28">
      <div className="container max-w-7xl">
        <Link href="/" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
        </Link>

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="max-w-xl"
          >
            <p className="eyebrow text-primary">Adopt a tree</p>
            <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-3 text-balance">
              Give a tree a name. Follow its <em className="not-italic text-primary">story</em> as it grows.
            </h1>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Somewhere out there, a tree is already in the ground – watered, measured, watched over. Put your name on it,
              and its whole life becomes a story you get to follow.
            </p>

            <ul className="mt-8 space-y-3">
              {TRUST.map((t) => (
                <li key={t.label} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <t.icon className="h-3.5 w-3.5" />
                  </span>
                  {t.label}
                </li>
              ))}
            </ul>

            {trees && trees.length > 0 && (
              <p className="mt-8 inline-flex items-center gap-3 rounded-full border border-border/70 bg-card px-5 py-2.5 soft-shadow">
                <span className="font-serif text-lg text-primary">{trees.length}</span>
                <span className="text-sm text-muted-foreground">
                  trees waiting for a name
                  {adoptedCount > 0 && <> – <span className="text-foreground font-medium">{adoptedCount}</span> already adopted</>}
                </span>
              </p>
            )}
          </motion.div>

          <div className="relative w-full">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-primary/10 blur-3xl" aria-hidden />

            {trees === null ? (
              <Skeleton className="h-[480px] w-full rounded-[2rem]" />
            ) : !featured ? (
              <div className="rounded-[2rem] border border-dashed border-border/70 p-12 text-center">
                <p className="text-sm text-muted-foreground">No trees available for adoption right now – check back soon.</p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut', delay: 0.1 }}
                className="group overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_36px_80px_-40px_rgba(24,25,18,0.45)] transition duration-300 hover:border-primary/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <TreeThumb src={featured.photoUri} alt={featured.nickname} />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur px-3 py-1.5 text-[11px] font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified
                  </span>
                  <span className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur">
                    <Heart className={`h-4 w-4 ${featured.isAdopted ? 'fill-primary text-primary' : 'text-foreground'}`} />
                  </span>
                  <div className="absolute bottom-4 left-5 text-white">
                    <h3 className="font-serif text-2xl leading-none drop-shadow">{featured.nickname}</h3>
                    <p className="text-xs italic mt-1.5 text-white/85">{featured.speciesName}</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-2.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                      Planted on {new Date(featured.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {featured.ngoName && (
                      <p className="flex items-center gap-2.5"><Users className="h-4 w-4 shrink-0 text-primary" /> Cared for by {featured.ngoName}</p>
                    )}
                    <p className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" /> {[featured.location, featured.city].filter(Boolean).join(', ') || 'Location TBA'}
                    </p>
                  </div>

                  <Link
                    href={user ? `/dashboard/individual/adoptions/${featured.id}` : '/register'}
                    className="group/cta mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground h-12 text-sm font-medium hover:bg-primary/90 transition"
                  >
                    Adopt This Tree
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                  <p className="mt-3 text-center">
                    <Link href={exploreHref} className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                      Explore more trees
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

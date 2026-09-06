'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, MapPin, Navigation, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '@/lib/memberProxy'

const FILTERS = [
  { key: 'all', label: 'All drives' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'near', label: 'Near me' },
  { key: 'mine', label: 'My bookings' },
]

function DriveThumb({ src, alt }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/20 to-sand/25">
        <CalendarDays className="h-8 w-8 text-primary/50" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
    />
  )
}

function DriveCard({ drive, index, showDistance }) {
  const cancelled = drive.status === 'cancelled'
  const starts = new Date(drive.startsAt)
  const hasCapacity = drive.capacity != null && drive.capacity > 0
  const filled = hasCapacity ? Math.min(100, Math.round((drive.confirmedCount / drive.capacity) * 100)) : 0
  const spotsLeft = hasCapacity ? Math.max(0, drive.capacity - drive.confirmedCount) : null
  const nearlyFull = hasCapacity && spotsLeft > 0 && filled >= 80

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: Math.min(index, 5) * 0.06 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition duration-300 hover:border-primary/40 hover:-translate-y-1"
    >
      <Link href={`/dashboard/individual/drives/${drive.id}`} className="relative block aspect-[16/9] overflow-hidden bg-secondary">
        <DriveThumb src={drive.photoUri} alt={drive.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <span className="absolute top-3 left-3 rounded-2xl bg-background/95 backdrop-blur px-3 py-2 text-center leading-none soft-shadow">
          <span className="block text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {starts.toLocaleDateString(undefined, { month: 'short' })}
          </span>
          <span className="block font-serif text-xl mt-1">{starts.getDate()}</span>
        </span>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {cancelled ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : drive.isRsvped ? (
            <Badge className="gap-1"><Check className="h-3 w-3" /> Going</Badge>
          ) : nearlyFull ? (
            <Badge variant="secondary">{spotsLeft} spots left</Badge>
          ) : null}
          {showDistance && drive.distanceKm != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-[10px] font-medium">
              <Navigation className="h-3 w-3 text-primary" /> {drive.distanceKm < 1 ? '<1' : Math.round(drive.distanceKm)} km
            </span>
          )}
        </div>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/95">
          <Clock className="h-3 w-3" />
          {starts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/dashboard/individual/drives/${drive.id}`}>
          <h3 className="font-serif text-lg leading-snug transition-colors group-hover:text-primary">{drive.title}</h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">{drive.ngoName}</p>

        <p className="mt-3.5 flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-px text-primary" />
          {[drive.address, drive.city].filter(Boolean).join(', ') || 'Location TBA'}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              {drive.confirmedCount} going
            </span>
            {hasCapacity && (
              <span className={spotsLeft === 0 ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} of ${drive.capacity} left`}
              </span>
            )}
          </div>
          {hasCapacity && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/70">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(filled, 3)}%` }} />
            </div>
          )}
        </div>

        <Link
          href={`/dashboard/individual/drives/${drive.id}`}
          className="group/cta mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground h-11 text-sm font-medium hover:bg-primary/90 transition"
        >
          {drive.isRsvped ? 'View your booking' : 'Reserve a place'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  )
}

export default function DrivesClient() {
  const [drives, setDrives] = useState(null)
  const [filter, setFilter] = useState('all')
  const [coords, setCoords] = useState(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : ''
    proxy(`/drives${query}`)
      .then(setDrives)
      .catch((err) => {
        setDrives([])
        toast.error(err.message || 'Could not load drives.')
      })
  }, [coords])

  const selectFilter = (key) => {
    if (key === 'near' && !coords) {
      if (!navigator.geolocation) {
        toast.error('Location isn’t available in this browser.')
        return
      }
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setFilter('near')
          setLocating(false)
        },
        () => {
          toast.error('Couldn’t get your location — check your browser permissions.')
          setLocating(false)
        },
      )
      return
    }
    setFilter(key)
  }

  const counts = useMemo(() => {
    if (!drives) return null
    const now = Date.now()
    return {
      all: drives.length,
      upcoming: drives.filter((d) => new Date(d.startsAt).getTime() >= now).length,
      near: drives.length,
      mine: drives.filter((d) => d.isRsvped).length,
    }
  }, [drives])

  const visible = useMemo(() => {
    if (!drives) return null
    const now = Date.now()
    if (filter === 'upcoming') return drives.filter((d) => new Date(d.startsAt).getTime() >= now)
    if (filter === 'mine') return drives.filter((d) => d.isRsvped)
    return drives
  }, [drives, filter])

  const summary = useMemo(() => {
    if (!drives || drives.length === 0) return null
    const now = Date.now()
    const upcoming = drives.filter((d) => new Date(d.startsAt).getTime() >= now)
    const going = drives.reduce((n, d) => n + (d.confirmedCount ?? 0), 0)
    const open = drives.reduce(
      (n, d) => n + (d.capacity != null ? Math.max(0, d.capacity - d.confirmedCount) : 0),
      0,
    )
    return { upcoming: upcoming.length, going, open }
  }, [drives])

  return (
    <div className="pt-24 md:pt-28 pb-28">
      <div className="container max-w-7xl">
        <Link href="/" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-wrap items-end justify-between gap-6"
        >
          <div className="max-w-xl">
            <p className="eyebrow text-primary">Join a drive</p>
            <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-3 text-balance">
              Plant with <em className="not-italic text-primary">people</em> who show up.
            </h1>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Verified drives run by partner NGOs — a morning, a patch of earth, and a few dozen hands. Reserve your place.
            </p>
          </div>

          {summary && (
            <div className="flex items-center gap-7 rounded-3xl border border-border/70 bg-card px-6 py-4 soft-shadow">
              <div>
                <p className="font-serif text-2xl leading-none">{summary.upcoming}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">Upcoming</p>
              </div>
              <span className="h-9 w-px bg-border" />
              <div>
                <p className="font-serif text-2xl leading-none">{summary.going}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">Going</p>
              </div>
              {summary.open > 0 && (
                <>
                  <span className="h-9 w-px bg-border" />
                  <div>
                    <p className="font-serif text-2xl leading-none text-primary">{summary.open}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">Spots open</p>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-border/70 pb-5">
          {FILTERS.map((f) => {
            const active = filter === f.key
            const count = counts?.[f.key]
            const isLocating = f.key === 'near' && locating
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => selectFilter(f.key)}
                disabled={isLocating}
                className={`inline-flex items-center gap-2 rounded-full border px-5 h-10 text-sm transition disabled:opacity-60 ${
                  active ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                {f.key === 'near' && <Navigation className="h-3.5 w-3.5" />}
                {isLocating ? 'Locating…' : f.label}
                {!isLocating && count != null && f.key !== 'near' && (
                  <span className={`text-xs ${active ? 'opacity-70' : 'text-muted-foreground'}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-8">
          {visible === null ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[420px] w-full rounded-3xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 py-20 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary/70" />
              </span>
              <p className="mt-4 font-serif text-xl">Nothing here just yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {filter === 'mine' ? "You haven't reserved a place on any drive yet." : 'No drives match this filter right now — check back soon.'}
              </p>
              {filter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-5 h-10 text-sm transition hover:border-primary/50 hover:bg-primary/5"
                >
                  See all drives
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((d, i) => (
                <DriveCard key={d.id} drive={d} index={i} showDistance={filter === 'near'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Users, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../../proxy'

export default function DrivesListClient() {
  const [drives, setDrives] = useState(null)

  useEffect(() => {
    proxy('/drives')
      .then(setDrives)
      .catch((err) => toast.error(err.message || 'Could not load drives.'))
  }, [])

  return (
    <div className="max-w-3xl">
      <p className="eyebrow text-primary">Join a drive</p>
      <h1 className="font-serif text-3xl md:text-4xl mt-2">Plant with people who show up.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Verified drives run by partner NGOs. Reserve your place.</p>

      <div className="mt-8 space-y-3">
        {drives === null ? (
          <>
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </>
        ) : drives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming drives right now — check back soon.</p>
        ) : (
          drives.map((d) => (
            <Link
              key={d.id}
              href={`/app/drives/${d.id}`}
              className="block rounded-3xl border border-border/70 bg-card p-5 transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.ngoName}</p>
                </div>
                {d.isRsvped && (
                  <Badge variant="secondary" className="shrink-0">
                    <Check className="h-3 w-3" /> Going
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {[d.address, d.city].filter(Boolean).join(', ') || 'Location TBA'}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {new Date(d.startsAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {d.confirmedCount}
                  {d.capacity != null ? ` / ${d.capacity}` : ''} going
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

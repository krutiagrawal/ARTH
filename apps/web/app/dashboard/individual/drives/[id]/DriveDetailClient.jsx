'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Users, Sprout, Info, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import LocationActions from '@/components/dashboard-individual/LocationActions'
import SponsorPlantDialog from '../SponsorPlantDialog'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

export default function DriveDetailClient({ driveId }) {
  const [drive, setDrive] = useState(null)
  const [rsvping, setRsvping] = useState(false)
  const [sponsoring, setSponsoring] = useState(null)
  const [photoBroken, setPhotoBroken] = useState(false)

  const load = () => proxy(`/drives/${driveId}`).then(setDrive).catch((err) => toast.error(err.message || 'Could not load this drive.'))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driveId])

  const toggleRsvp = async () => {
    if (!drive) return
    setRsvping(true)
    try {
      if (drive.isRsvped) {
        await proxy(`/drives/${driveId}/rsvp`, { method: 'DELETE' })
        toast.success('RSVP cancelled.')
      } else {
        await proxy(`/drives/${driveId}/rsvp`, { method: 'POST' })
        toast.success("You're in!")
      }
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setRsvping(false)
    }
  }

  if (!drive) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
  }

  const isFull = drive.capacity != null && drive.confirmedCount >= drive.capacity && !drive.isRsvped
  const isCancelled = drive.status === 'cancelled'

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/individual/drives" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
        <div className="relative aspect-[16/9] bg-secondary">
          {drive.photoUri && !photoBroken ? (
            <img src={resolveMediaUrl(drive.photoUri)} alt={drive.title} onError={() => setPhotoBroken(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/15 to-sand/20">
              <CalendarDays className="h-16 w-16 text-primary/40" />
            </div>
          )}
          {drive.isRsvped && !isCancelled && (
            <Badge variant="secondary" className="absolute top-4 right-4">
              <CalendarCheck className="h-3 w-3" /> You&rsquo;re going
            </Badge>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div>
            <p className="eyebrow text-primary">{drive.ngoName}</p>
            <h1 className="font-serif text-3xl md:text-4xl mt-2">{drive.title}</h1>
          </div>

          <p className="text-sm text-muted-foreground whitespace-pre-line">{drive.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> When</p>
              <p className="text-sm mt-1.5">
                {new Date(drive.startsAt).toLocaleString()}
                {drive.durationMinutes ? ` · ${drive.durationMinutes} min` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Going</p>
              <p className="text-sm mt-1.5">{drive.confirmedCount}{drive.capacity != null ? ` of ${drive.capacity} spots` : ''}</p>
            </div>
          </div>

          <LocationActions label={drive.transportMode === 'ngo_provided' ? 'Drive location' : 'Location'} address={[drive.address, drive.city].filter(Boolean).join(', ')} />

          {drive.transportMode === 'ngo_provided' && drive.pickupPoints?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pickup points</p>
              {drive.pickupPoints.map((p, i) => (
                <LocationActions
                  key={p.id}
                  label={`Stop ${i + 1} · Reach by ${new Date(p.arrivalBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  address={p.address}
                />
              ))}
            </div>
          )}

          {drive.instructions && (
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Info className="h-3.5 w-3.5" /> Good to know
              </p>
              <p className="mt-1.5 text-sm whitespace-pre-line">{drive.instructions}</p>
            </div>
          )}

          {drive.plants?.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Sprout className="h-3.5 w-3.5" /> Sponsor a plant
              </p>
              <div className="mt-2 space-y-2">
                {drive.plants.map((plant) => (
                  <div key={plant.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
                    <div>
                      <p className="text-sm font-medium">{plant.speciesName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRupees(plant.priceCents)}
                        {plant.sponsoredCount > 0 ? ` · sponsored ${plant.sponsoredCount}×` : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={() => setSponsoring(plant)}>
                      Sponsor
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border/70">
            <div className="pt-4">
              {isCancelled ? (
                <Badge variant="destructive">This drive has been cancelled by the organizer.</Badge>
              ) : (
                <Button
                  onClick={toggleRsvp}
                  disabled={rsvping || (isFull && !drive.isRsvped)}
                  variant={drive.isRsvped ? 'secondary' : 'default'}
                  className="rounded-full"
                  size="lg"
                >
                  {rsvping ? 'Please wait…' : drive.isRsvped ? 'Cancel my RSVP' : isFull ? 'Drive is full' : "I'm in — RSVP"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <SponsorPlantDialog
        driveId={driveId}
        plant={sponsoring}
        onOpenChange={(open) => !open && setSponsoring(null)}
        onSponsored={() => {
          toast.success('Thank you for sponsoring this plant!')
          setSponsoring(null)
          load()
        }}
      />
    </div>
  )
}

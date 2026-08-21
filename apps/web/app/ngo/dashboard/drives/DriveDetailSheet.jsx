'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Users, Sprout, Edit3 } from 'lucide-react'
import DrawerFormShell, { FormSection, DetailRow, DetailGrid } from '@/components/dashboard/DrawerFormShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../proxy'

const STATUS_VARIANT = { upcoming: 'default', completed: 'secondary', cancelled: 'destructive' }
const TRANSPORT_LABEL = { self_arrange: 'Volunteers make their own way', ngo_provided: "NGO provides transport" }

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

export default function DriveDetailSheet({ drive, onOpenChange, onEdit }) {
  const [loading, setLoading] = useState(true)
  const [attendees, setAttendees] = useState([])

  useEffect(() => {
    if (!drive) return
    setLoading(true)
    proxy(`/drives/${drive.id}/attendees`)
      .then((data) => setAttendees(data.attendees))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [drive])

  const totalSponsoredCents = (drive?.plants ?? []).reduce((sum, p) => sum + p.priceCents * p.sponsoredCount, 0)

  return (
    <DrawerFormShell
      open={Boolean(drive)}
      onOpenChange={onOpenChange}
      icon={CalendarDays}
      eyebrow="NGO Dashboard"
      title={drive?.title}
      description="Full details and activity for this drive."
      widthClassName="w-full sm:max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onEdit(drive)}>
            <Edit3 className="h-3.5 w-3.5" /> Edit drive
          </Button>
        </>
      }
    >
      {drive && (
        <>
          <FormSection first label="Overview">
            <DetailGrid>
              <DetailRow label="Status">
                <Badge variant={STATUS_VARIANT[drive.status] || 'outline'} className="capitalize">
                  {drive.status}
                </Badge>
              </DetailRow>
              <DetailRow label="RSVPs">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {drive.confirmedCount}
                  {drive.capacity != null ? ` / ${drive.capacity}` : ' (no limit)'}
                </span>
              </DetailRow>
              <DetailRow label="Starts" full>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(drive.startsAt).toLocaleString()}
                  {drive.durationMinutes ? ` · ${drive.durationMinutes} min` : ''}
                </span>
              </DetailRow>
              <DetailRow label="Description" full>
                <p className="whitespace-pre-line">{drive.description}</p>
              </DetailRow>
              <DetailRow label="Instructions for volunteers" full>
                <p className="whitespace-pre-line">{drive.instructions}</p>
              </DetailRow>
              <DetailRow label="Published">{drive.createdAt && new Date(drive.createdAt).toLocaleDateString()}</DetailRow>
              <DetailRow label="Last updated">{drive.updatedAt && new Date(drive.updatedAt).toLocaleDateString()}</DetailRow>
            </DetailGrid>
          </FormSection>

          <FormSection label="Location & transport">
            <DetailGrid>
              <DetailRow label="Address" full>
                <span className="flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {[drive.address, drive.city].filter(Boolean).join(', ') || 'Not set'}
                </span>
              </DetailRow>
              <DetailRow label="Transport" full>{TRANSPORT_LABEL[drive.transportMode]}</DetailRow>
            </DetailGrid>
            {drive.transportMode === 'ngo_provided' && drive.pickupPoints?.length > 0 && (
              <div className="mt-3 space-y-2">
                {drive.pickupPoints.map((p, i) => (
                  <div key={p.id} className="rounded-[8px] border border-border/60 bg-secondary/20 p-2 text-[12px]">
                    <p className="font-medium">Stop {i + 1} · {p.address}</p>
                    <p className="text-muted-foreground">Reach by {new Date(p.arrivalBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {drive.plants?.length > 0 && (
            <FormSection label="Plants & sponsorships">
              <DetailRow label="Total sponsored" full>{rupees(totalSponsoredCents)}</DetailRow>
              <div className="mt-2 space-y-1.5">
                {drive.plants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-[8px] border border-border/60 px-2.5 py-1.5 text-[12px]">
                    <span className="flex items-center gap-1.5">
                      <Sprout className="h-3.5 w-3.5 text-muted-foreground" /> {p.speciesName}
                    </span>
                    <span className="text-muted-foreground">
                      {rupees(p.priceCents)} · sponsored {p.sponsoredCount}×
                    </span>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          <FormSection label={`Attendees (${drive.confirmedCount})`}>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : attendees.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No RSVPs yet.</p>
            ) : (
              <div className="space-y-1.5">
                {attendees.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-[8px] border border-border/60 px-2.5 py-1.5">
                    <div>
                      <p className="text-[13px] font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">{a.handle}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{new Date(a.rsvpedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </>
      )}
    </DrawerFormShell>
  )
}

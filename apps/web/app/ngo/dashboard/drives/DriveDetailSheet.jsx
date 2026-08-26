'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Users, Sprout, Edit3 } from 'lucide-react'
import DrawerFormShell, { DetailPanel, DetailSection, DetailRow, DetailGrid, DetailList } from '@/components/dashboard/DrawerFormShell'
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
        <DetailPanel>
          <DetailSection label="Overview">
            <DetailGrid>
              <DetailRow label="Status">
                <Badge variant={STATUS_VARIANT[drive.status] || 'outline'} className="capitalize">
                  {drive.status}
                </Badge>
              </DetailRow>
              <DetailRow label="RSVPs">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {drive.confirmedCount}
                  {drive.capacity != null ? ` / ${drive.capacity}` : ' (no limit)'}
                </span>
              </DetailRow>
              <DetailRow label="Starts" full>
                <span className="flex items-center gap-1.5">
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
          </DetailSection>

          <DetailSection label="Location & transport">
            <DetailGrid>
              <DetailRow label="Address" full>
                <span className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {[drive.address, drive.city].filter(Boolean).join(', ') || 'Not set'}
                </span>
              </DetailRow>
              <DetailRow label="Transport" full>{TRANSPORT_LABEL[drive.transportMode]}</DetailRow>
            </DetailGrid>
            {drive.transportMode === 'ngo_provided' && drive.pickupPoints?.length > 0 && (
              <DetailList>
                {drive.pickupPoints.map((p, i) => (
                  <div key={p.id} className="py-2.5 text-[13px] first:pt-3.5 last:pb-0">
                    <p className="font-medium text-foreground">Stop {i + 1} · {p.address}</p>
                    <p className="mt-0.5 text-muted-foreground">Reach by {new Date(p.arrivalBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </DetailList>
            )}
          </DetailSection>

          {drive.plants?.length > 0 && (
            <DetailSection label="Plants & sponsorships">
              <DetailRow label="Total sponsored" full>{rupees(totalSponsoredCents)}</DetailRow>
              <DetailList>
                {drive.plants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 text-[13px] first:pt-3.5 last:pb-0">
                    <span className="flex items-center gap-1.5">
                      <Sprout className="h-3.5 w-3.5 text-muted-foreground" /> {p.speciesName}
                    </span>
                    <span className="text-muted-foreground">
                      {rupees(p.priceCents)} · sponsored {p.sponsoredCount}×
                    </span>
                  </div>
                ))}
              </DetailList>
            </DetailSection>
          )}

          <DetailSection label={`Attendees (${drive.confirmedCount})`}>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : attendees.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No RSVPs yet.</p>
            ) : (
              <DetailList>
                {attendees.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{a.name}</p>
                      <p className="text-[12px] text-muted-foreground">{a.handle}</p>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{new Date(a.rsvpedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </DetailList>
            )}
          </DetailSection>
        </DetailPanel>
      )}
    </DrawerFormShell>
  )
}

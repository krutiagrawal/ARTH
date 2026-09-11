'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, MapPin, CalendarDays, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import DrawerFormShell, { fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import { resolveMediaUrl } from '@/lib/media'
import { proxy } from '../proxy'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'responded', label: 'Responded' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
]

function tabOf(req) {
  if (!req.myResponse) return 'open'
  if (req.myResponse.status === 'proposed') return 'responded'
  if (req.myResponse.status === 'accepted') return 'accepted'
  if (req.myResponse.status === 'fulfilled') return 'completed'
  return 'other' // declined / withdrawn
}

const RESPONSE_BADGE = {
  proposed: { label: 'Responded', variant: 'secondary' },
  accepted: { label: 'Accepted – arrange handoff', variant: 'default' },
  declined: { label: 'Declined', variant: 'outline' },
  fulfilled: { label: 'Completed', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'outline' },
}

function RespondSheet({ open, onOpenChange, requirement, submitting, onSubmit }) {
  const [quantityOffered, setQuantityOffered] = useState('')
  const [priceRupees, setPriceRupees] = useState('')
  const [canDeliver, setCanDeliver] = useState(false)
  const [canPickup, setCanPickup] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) {
      setQuantityOffered('')
      setPriceRupees('')
      setCanDeliver(false)
      setCanPickup(true)
      setMessage('')
    }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    if (!quantityOffered) return
    onSubmit({
      quantityOffered: Number(quantityOffered),
      priceCents: priceRupees ? Math.round(Number(priceRupees) * 100) : undefined,
      canDeliver,
      canPickup,
      message: message || undefined,
    })
  }

  return (
    <DrawerFormShell
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardList}
      eyebrow="Nursery Dashboard"
      title="Respond to requirement"
      description={requirement ? `For ${requirement.ngo?.orgName || 'this NGO'}` : ''}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="respond-form" size="sm" disabled={submitting} className={fieldButtonClassName}>
            {submitting ? 'Sending…' : 'Send response'}
          </Button>
        </>
      }
    >
      <form id="respond-form" onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Quantity you can offer *</span>
          <Input type="number" min="1" required value={quantityOffered} onChange={(e) => setQuantityOffered(e.target.value)} className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Price per unit (₹, optional)</span>
          <Input type="number" min="0" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} className="mt-1 h-9 rounded-full" />
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canPickup} onChange={(e) => setCanPickup(e.target.checked)} className="h-4 w-4 rounded border-border/70" /> Can be picked up
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canDeliver} onChange={(e) => setCanDeliver(e.target.checked)} className="h-4 w-4 rounded border-border/70" /> Can deliver
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Message (optional)</span>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 rounded-xl" />
        </label>
      </form>
    </DrawerFormShell>
  )
}

export default function RequirementsClient() {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [respondFor, setRespondFor] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [fulfillTarget, setFulfillTarget] = useState(null)
  const [withdrawTarget, setWithdrawTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRequirements(await proxy('/nursery/bulk-requirements'))
    } catch (err) {
      toast.error(err.message || 'Could not load bulk requirements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (tab === 'all') return requirements
    return requirements.filter((r) => tabOf(r) === tab)
  }, [requirements, tab])

  const handleRespond = async (body) => {
    setSubmitting(true)
    try {
      await proxy(`/nursery/bulk-requirements/${respondFor.id}/respond`, { method: 'POST', body })
      toast.success('Response sent.')
      setRespondFor(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawTarget) return
    try {
      await proxy(`/nursery/bulk-requirements/responses/${withdrawTarget.myResponse.id}/withdraw`, { method: 'POST' })
      toast.success('Response withdrawn.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWithdrawTarget(null)
      await load()
    }
  }

  const handleFulfill = async () => {
    if (!fulfillTarget) return
    try {
      await proxy(`/nursery/bulk-requirements/responses/${fulfillTarget.myResponse.id}/fulfilled`, { method: 'POST' })
      toast.success('Marked as fulfilled.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setFulfillTarget(null)
      await load()
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Bulk Requirements</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">NGO requirements near you</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing here" body="Bulk requirements from NGOs will show up here as they come in." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((r) => {
            const badge = r.myResponse ? RESPONSE_BADGE[r.myResponse.status] : null
            return (
              <div key={r.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {r.ngo?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(r.ngo.logoUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-serif">{r.ngo?.orgName?.charAt(0) || 'N'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.ngo?.orgName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.species?.commonName || r.speciesNote || 'Any species'}
                      {r.nativePreferred ? ' · Native preferred' : ''}
                    </p>
                  </div>
                  {badge && <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Leaf className="h-3 w-3" /> {r.quantityFulfilled}/{r.quantityNeeded} fulfilled</span>
                  {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city}{r.distanceKm != null ? ` · ${r.distanceKm.toFixed(1)} km` : ''}</span>}
                  {r.neededByDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> By {new Date(r.neededByDate).toLocaleDateString()}</span>}
                </div>

                {r.notes && <p className="mt-2 text-xs text-muted-foreground">{r.notes}</p>}

                {r.myResponse && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    You offered {r.myResponse.quantityOffered}
                    {r.myResponse.priceCents != null ? ` @ ₹${(r.myResponse.priceCents / 100).toLocaleString('en-IN')}` : ''}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  {!r.myResponse && (
                    <Button size="sm" className="rounded-full" onClick={() => setRespondFor(r)}>Respond</Button>
                  )}
                  {r.myResponse?.status === 'proposed' && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setWithdrawTarget(r)}>Withdraw</Button>
                  )}
                  {r.myResponse?.status === 'accepted' && (
                    <Button size="sm" className="rounded-full" onClick={() => setFulfillTarget(r)}>Mark fulfilled</Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RespondSheet open={Boolean(respondFor)} onOpenChange={(open) => !open && setRespondFor(null)} requirement={respondFor} submitting={submitting} onSubmit={handleRespond} />

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        onOpenChange={(open) => !open && setWithdrawTarget(null)}
        title="Withdraw this response?"
        description="The NGO will no longer see your offer for this requirement."
        confirmLabel="Withdraw"
        destructive
        onConfirm={handleWithdraw}
      />

      <ConfirmDialog
        open={Boolean(fulfillTarget)}
        onOpenChange={(open) => !open && setFulfillTarget(null)}
        title="Mark as fulfilled?"
        description="Confirm this only once the handoff to the NGO has actually happened."
        confirmLabel="Mark fulfilled"
        onConfirm={handleFulfill}
      />
    </DashboardPageShell>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, MapPin, CalendarDays, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import DrawerFormShell, { fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import { proxy } from '../proxy'

const REQ_BADGE = {
  open: { label: 'Open', variant: 'outline' },
  partially_fulfilled: { label: 'Partially fulfilled', variant: 'secondary' },
  fulfilled: { label: 'Fulfilled', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  expired: { label: 'Expired', variant: 'outline' },
}

const RESPONSE_BADGE = {
  proposed: { label: 'Offered', variant: 'secondary' },
  accepted: { label: 'Accepted — awaiting handoff', variant: 'default' },
  handed_off: { label: 'Handed off — confirm receipt', variant: 'default' },
  declined: { label: 'Declined', variant: 'outline' },
  fulfilled: { label: 'Fulfilled', variant: 'default' },
  withdrawn: { label: 'Withdrawn', variant: 'outline' },
}

function CreateSheet({ open, onOpenChange, submitting, onSubmit }) {
  const [speciesNote, setSpeciesNote] = useState('')
  const [quantityNeeded, setQuantityNeeded] = useState('')
  const [neededByDate, setNeededByDate] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setSpeciesNote('')
      setQuantityNeeded('')
      setNeededByDate('')
      setCity('')
      setNotes('')
    }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    if (!quantityNeeded) return
    onSubmit({
      speciesNote: speciesNote || undefined,
      quantityNeeded: Number(quantityNeeded),
      neededByDate: neededByDate ? new Date(neededByDate).toISOString() : undefined,
      city: city || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <DrawerFormShell
      open={open}
      onOpenChange={onOpenChange}
      icon={ClipboardList}
      eyebrow="NGO Dashboard"
      title="New bulk requirement"
      description="Ask nurseries nearby for saplings at scale."
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className={fieldButtonClassName} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="requirement-form" size="sm" disabled={submitting} className={fieldButtonClassName}>
            {submitting ? 'Posting…' : 'Post requirement'}
          </Button>
        </>
      }
    >
      <form id="requirement-form" onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Species (optional description)</span>
          <Input value={speciesNote} onChange={(e) => setSpeciesNote(e.target.value)} placeholder="eg – Native shade trees" className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Quantity needed *</span>
          <Input type="number" min="1" required value={quantityNeeded} onChange={(e) => setQuantityNeeded(e.target.value)} className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Needed by (optional)</span>
          <Input type="date" value={neededByDate} onChange={(e) => setNeededByDate(e.target.value)} className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">City (optional)</span>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="eg – Pune" className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Notes (optional)</span>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 rounded-xl" />
        </label>
      </form>
    </DrawerFormShell>
  )
}

export default function RequirementsClient() {
  const [requirements, setRequirements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [declineTarget, setDeclineTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // response being confirmed-received
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRequirements(await proxy('/ngo/bulk-requirements'))
    } catch (err) {
      toast.error(err.message || 'Could not load bulk requirements.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (body) => {
    setSubmitting(true)
    try {
      await proxy('/ngo/bulk-requirements', { method: 'POST', body })
      toast.success('Requirement posted.')
      setShowCreate(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await proxy(`/ngo/bulk-requirements/${cancelTarget.id}/cancel`, { method: 'POST' })
      toast.success('Requirement cancelled.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setCancelTarget(null)
      await load()
    }
  }

  const handleAccept = async (response) => {
    try {
      await proxy(`/ngo/bulk-requirements/responses/${response.id}/accept`, { method: 'POST' })
      toast.success('Offer accepted.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    }
  }

  const handleDecline = async () => {
    if (!declineTarget) return
    try {
      await proxy(`/ngo/bulk-requirements/responses/${declineTarget.id}/decline`, { method: 'POST' })
      toast.success('Offer declined.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setDeclineTarget(null)
      await load()
    }
  }

  const openConfirmReceipt = (response) => {
    setConfirmTarget(response)
    setConfirmCode('')
  }

  const handleConfirmReceived = async () => {
    if (!confirmTarget || !confirmCode.trim()) return
    setConfirmSubmitting(true)
    try {
      await proxy(`/ngo/bulk-requirements/responses/${confirmTarget.id}/confirm-received`, {
        method: 'POST',
        body: { code: confirmCode.trim() },
      })
      toast.success('Receipt confirmed.')
      setConfirmTarget(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Incorrect handoff code.')
    } finally {
      setConfirmSubmitting(false)
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Bulk Requirements</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Ask nurseries for saplings</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New requirement
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : requirements.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requirements yet"
          body="Post one to ask nurseries nearby to supply saplings in bulk."
          actionLabel="New requirement"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-4">
          {requirements.map((r) => {
            const badge = REQ_BADGE[r.status]
            return (
              <div key={r.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.species?.commonName || r.speciesNote || 'Any species'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{r.quantityFulfilled}/{r.quantityNeeded} fulfilled</span>
                      {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city}</span>}
                      {r.neededByDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> By {new Date(r.neededByDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                    {['open', 'partially_fulfilled'].includes(r.status) && (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCancelTarget(r)}>Cancel</Button>
                    )}
                  </div>
                </div>

                {r.notes && <p className="mt-2 text-xs text-muted-foreground">{r.notes}</p>}

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Nursery offers</p>
                  {!r.responses || r.responses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No offers yet.</p>
                  ) : (
                    r.responses.map((resp) => (
                      <div key={resp.id} className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{resp.nursery?.nurseryName}</p>
                            <p className="text-xs text-muted-foreground">
                              {resp.quantityOffered} offered{resp.priceCents != null ? ` · ₹${(resp.priceCents / 100).toLocaleString('en-IN')}` : ' · Free'}
                              {' · '}{[resp.canPickup && 'Pickup', resp.canDeliver && 'Delivery'].filter(Boolean).join(' + ') || '—'}
                            </p>
                            {resp.message && <p className="mt-1 text-xs italic text-muted-foreground">{resp.message}</p>}
                          </div>
                          <Badge variant={RESPONSE_BADGE[resp.status]?.variant || 'outline'}>{RESPONSE_BADGE[resp.status]?.label || resp.status}</Badge>
                        </div>
                        {resp.status === 'proposed' && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" className="rounded-full" onClick={() => handleAccept(resp)}>Accept</Button>
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDeclineTarget(resp)}>Decline</Button>
                          </div>
                        )}
                        {resp.status === 'handed_off' && (
                          <div className="mt-2">
                            <Button size="sm" className="rounded-full" onClick={() => openConfirmReceipt(resp)}>Confirm receipt</Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateSheet open={showCreate} onOpenChange={setShowCreate} submitting={submitting} onSubmit={handleCreate} />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this requirement?"
        description="Nurseries will no longer be able to respond."
        confirmLabel="Cancel requirement"
        destructive
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={Boolean(declineTarget)}
        onOpenChange={(open) => !open && setDeclineTarget(null)}
        title="Decline this offer?"
        description="The nursery will be notified their offer wasn't accepted."
        confirmLabel="Decline"
        destructive
        onConfirm={handleDecline}
      />

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title="Confirm receipt"
        description="Ask the nursery for their handoff code, then enter it below. This is what actually marks the offer fulfilled — never confirm without checking the saplings arrived."
        confirmLabel="Confirm receipt"
        loading={confirmSubmitting}
        onConfirm={handleConfirmReceived}
      >
        <Input
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
          placeholder="Handoff code"
          className="mt-2 h-9 rounded-full"
        />
      </ConfirmDialog>
    </DashboardPageShell>
  )
}

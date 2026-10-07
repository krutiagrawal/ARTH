'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList, MapPin, CalendarDays, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import DrawerFormShell, { fieldButtonClassName } from '@/components/dashboard/DrawerFormShell'
import { fuzzyMatch } from '@/lib/fuzzyMatch'
import { proxy } from '../proxy'
import { usePagedList } from '@/hooks/usePagedList'
import LoadMoreButton from '@/components/dashboard/LoadMoreButton'

const REQ_BADGE = {
  open: { label: 'Open', variant: 'outline' },
  partially_fulfilled: { label: 'Partially fulfilled', variant: 'secondary' },
  fulfilled: { label: 'Fulfilled', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  expired: { label: 'Expired', variant: 'destructive' },
}

// The due date's own day still counts as on-time; overdue begins the day after — matches the
// mobile app's isBulkRequirementOverdue (apps/mobile/src/utils/bulkRequirement.ts).
function isOverdue(r) {
  if (r.status === 'expired') return true
  if (!r.neededByDate || !['open', 'partially_fulfilled'].includes(r.status)) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return new Date(r.neededByDate) < startOfToday
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
  const [species, setSpecies] = useState([])
  const [speciesId, setSpeciesId] = useState('')
  const [speciesQuery, setSpeciesQuery] = useState('')
  const [speciesPickerOpen, setSpeciesPickerOpen] = useState(false)
  const [addingSpecies, setAddingSpecies] = useState(false)
  const [newSpeciesEmoji, setNewSpeciesEmoji] = useState('')
  const [addSpeciesError, setAddSpeciesError] = useState('')
  const [addingSpeciesBusy, setAddingSpeciesBusy] = useState(false)
  const [speciesNote, setSpeciesNote] = useState('')
  const [quantityNeeded, setQuantityNeeded] = useState('')
  const [neededByDate, setNeededByDate] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setSpeciesId('')
      setSpeciesQuery('')
      setSpeciesPickerOpen(false)
      setAddingSpecies(false)
      setNewSpeciesEmoji('')
      setAddSpeciesError('')
      setSpeciesNote('')
      setQuantityNeeded('')
      setNeededByDate('')
      setCity('')
      setNotes('')
      proxy('/species').then(setSpecies).catch(() => setSpecies([]))
    }
  }, [open])

  const handleAddSpecies = async () => {
    const commonName = speciesQuery.trim()
    if (!commonName || !newSpeciesEmoji.trim()) return
    setAddSpeciesError('')
    setAddingSpeciesBusy(true)
    try {
      const created = await proxy('/species', { method: 'POST', body: { commonName, emoji: newSpeciesEmoji.trim() } })
      setSpecies((prev) => (prev.some((s) => s.id === created.id) ? prev : [...prev, created]))
      setSpeciesId(created.id)
      setSpeciesQuery('')
      setNewSpeciesEmoji('')
      setAddingSpecies(false)
    } catch (err) {
      setAddSpeciesError(err.message || "Couldn't add that species. Please try again.")
    } finally {
      setAddingSpeciesBusy(false)
    }
  }

  // Linking to a catalog species (not just the free-text note below) is what lets nurseries'
  // stock get checked when they respond — see bulkRequirement.service.ts's respondToRequirement,
  // which only gates on quantity when requirement.speciesId is set. Fuzzy (not just substring) so
  // a typo or near-miss spelling ("roze", "gulmohr") still surfaces the existing entry instead of
  // nudging the NGO toward adding a near-duplicate.
  const filteredSpecies = useMemo(() => {
    if (!speciesQuery.trim()) return species.slice(0, 8)
    return fuzzyMatch(speciesQuery, species, (s) => s.commonName)
  }, [species, speciesQuery])

  const selectedSpecies = species.find((s) => s.id === speciesId)

  const submit = (e) => {
    e.preventDefault()
    if (!quantityNeeded) return
    onSubmit({
      speciesId: speciesId || undefined,
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
        <div className="relative">
          <span className="text-[11px] font-medium text-muted-foreground">Species (optional)</span>
          {selectedSpecies ? (
            <div className="mt-1 flex items-center justify-between rounded-full bg-secondary/40 px-4 py-2">
              <span className="text-sm font-medium">{selectedSpecies.emoji || '🌱'} {selectedSpecies.commonName}</span>
              <button type="button" onClick={() => setSpeciesId('')} className="text-xs font-semibold text-primary">Change</button>
            </div>
          ) : (
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={speciesQuery}
                onChange={(e) => { setSpeciesQuery(e.target.value); setSpeciesPickerOpen(true) }}
                onFocus={() => setSpeciesPickerOpen(true)}
                placeholder="Search catalog species, eg – Neem"
                className="h-9 rounded-full pl-8"
              />
              {!addingSpecies && speciesPickerOpen && filteredSpecies.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border/70 bg-background shadow-lg">
                  {filteredSpecies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSpeciesId(s.id); setSpeciesPickerOpen(false); setSpeciesQuery('') }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-secondary/40"
                    >
                      <span>{s.emoji || '🌱'}</span>
                      <span className="flex-1 truncate">{s.commonName}</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => { setAddingSpecies((v) => !v); setSpeciesPickerOpen(false) }}
                className="mt-1 text-xs font-semibold text-primary"
              >
                {addingSpecies ? '✕ Cancel' : "Can't find it? Add it to the catalog"}
              </button>
              {addingSpecies && (
                <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <p className="text-[11px] text-muted-foreground">
                    Adding &ldquo;{speciesQuery.trim() || '…'}&rdquo; — edit the name in the search box above.
                  </p>
                  <label className="block">
                    <span className="text-[11px] font-medium text-muted-foreground">Emoji</span>
                    <Input value={newSpeciesEmoji} onChange={(e) => setNewSpeciesEmoji(e.target.value)} placeholder="🌹" className="mt-1 h-9 w-20 rounded-full text-center" />
                  </label>
                  {addSpeciesError && <p className="text-xs text-destructive">{addSpeciesError}</p>}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={!speciesQuery.trim() || !newSpeciesEmoji.trim() || addingSpeciesBusy}
                    onClick={handleAddSpecies}
                  >
                    {addingSpeciesBusy ? 'Adding…' : `Add "${speciesQuery.trim() || '…'}" to the catalog`}
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Matching a catalog species lets nurseries&rsquo; existing stock be checked when they respond — leave blank for open-ended asks like &ldquo;any native species&rdquo;.
          </p>
        </div>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Additional description (optional)</span>
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
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [declineTarget, setDeclineTarget] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // response being confirmed-received
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  const { items: requirements, loading, loadingMore, hasMore, loadMore, reload: load } = usePagedList('/ngo/bulk-requirements', {}, {
    errorMessage: 'Could not load bulk requirements.',
    proxyFn: proxy,
  })

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

  const openReschedule = (requirement) => {
    setRescheduleTarget(requirement)
    setRescheduleDate('')
  }

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return
    setRescheduleSubmitting(true)
    try {
      await proxy(`/ngo/bulk-requirements/${rescheduleTarget.id}/reschedule`, {
        method: 'POST',
        body: { neededByDate: new Date(rescheduleDate).toISOString() },
      })
      toast.success('Requirement rescheduled.')
      setRescheduleTarget(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setRescheduleSubmitting(false)
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
            const overdue = isOverdue(r)
            return (
              <div key={r.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.species?.commonName || r.speciesNote || 'Any species'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{r.quantityFulfilled}/{r.quantityNeeded} fulfilled</span>
                      {r.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city}</span>}
                      {r.neededByDate && (
                        <span className={overdue ? 'flex items-center gap-1 text-destructive font-medium' : 'flex items-center gap-1'}>
                          <CalendarDays className="h-3 w-3" /> By {new Date(r.neededByDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                    {r.status === 'expired' && (
                      <Button size="sm" className="rounded-full" onClick={() => openReschedule(r)}>Reschedule</Button>
                    )}
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
                              {resp.quantityOffered} offered
                              {resp.priceCents != null
                                ? ` · ₹${(resp.priceCents / 100).toLocaleString('en-IN')} each · ₹${((resp.priceCents * resp.quantityOffered) / 100).toLocaleString('en-IN')} total`
                                : ' · Free'}
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
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
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
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
        title="Reschedule this requirement"
        description="Its deadline passed without being fulfilled. Pick a new date to reopen it to nurseries."
        confirmLabel="Reschedule"
        loading={rescheduleSubmitting}
        onConfirm={handleReschedule}
      >
        <Input
          type="date"
          value={rescheduleDate}
          onChange={(e) => setRescheduleDate(e.target.value)}
          className="mt-2 h-9 rounded-full"
        />
      </ConfirmDialog>

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

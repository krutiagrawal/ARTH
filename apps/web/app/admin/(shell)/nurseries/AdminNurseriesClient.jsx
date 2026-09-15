'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Sprout, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'
import { resolveMediaUrl } from '@/lib/media'

const STATUS_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }
const FILTERS = ['pending', 'approved', 'rejected', 'suspended']

const NURSERY_TYPE_LABELS = {
  retail: 'Retail nursery',
  wholesale: 'Wholesale nursery',
  native_plant: 'Native plant nursery',
  government: 'Government nursery',
  ngo_community: 'NGO / community nursery',
  landscaping: 'Landscaping nursery',
  other: 'Other',
}

const PLANT_CATEGORY_LABELS = {
  native: 'Native species',
  fruit: 'Fruit trees',
  ornamental: 'Ornamental plants',
  medicinal: 'Medicinal plants',
  large_trees: 'Large trees / saplings',
}

// Mirrors apps/mobile's GrowthLevelBadge / apps/web's nursery ReputationClient — same tiers,
// admin-panel-local copy since this file has its own light Field/Section rendering style.
const GROWTH_LEVEL_LABELS = {
  seedling: '🌱 Seedling',
  growing: '🪴 Growing',
  established: '🌳 Established',
  evergreen: '🌲 Evergreen',
}

const TRUST_FACTOR_LABELS = {
  fulfilment: 'Order fulfilment',
  rating: 'Buyer ratings',
  inventoryFreshness: 'Inventory freshness',
  responsiveness: 'Responsiveness',
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="eyebrow text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function NurseryDetailSheet({ nursery, onOpenChange, onAction }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!nursery) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    proxy(`/admin/nurseries/${nursery.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || "Couldn't load this nursery's details.")
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [nursery])

  const confirmCopy = {
    approve: { title: 'Approve this nursery?', confirmLabel: 'Approve', body: 'They can immediately start listing stock and taking orders.', status: 'approved' },
    reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
    suspend: { title: 'Suspend this nursery?', confirmLabel: 'Suspend', body: "They keep read access but can't publish anything new until reinstated.", status: 'suspended' },
    reinstate: { title: 'Reinstate this nursery?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
  }

  const runAction = async () => {
    if (!confirm) return
    const { status } = confirmCopy[confirm]
    setWorking(true)
    try {
      await onAction(nursery.id, status, reason)
      toast.success(`Nursery ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  if (!nursery) return null
  const d = detail || nursery

  return (
    <>
      <Sheet open={Boolean(nursery)} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="font-serif">{d.nurseryName}</SheetTitle>
            <SheetDescription>
              {d.owner?.name} · {d.owner?.email}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Badge variant={STATUS_VARIANT[d.status]} className="capitalize">
                {d.status}
              </Badge>
              {d.rejectionReason && <p className="mt-2 text-sm text-muted-foreground">Reason on file: &ldquo;{d.rejectionReason}&rdquo;</p>}
            </div>

            {loadingDetail && !detail ? (
              <p className="text-sm text-muted-foreground">Loading full application…</p>
            ) : (
              <>
                {d.verificationPhotoUrl && (
                  <Section title="Verification photo">
                    <img
                      src={resolveMediaUrl(d.verificationPhotoUrl)}
                      alt="Nursery name board with stock"
                      className="max-h-72 w-full rounded-lg border border-border/70 object-cover"
                    />
                  </Section>
                )}

                <Section title="Identity">
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                  <Field label="Nursery type" value={NURSERY_TYPE_LABELS[d.nurseryType] || d.nurseryType} />
                  <Field label="Year established" value={d.yearEstablished} />
                  <Field
                    label="Website"
                    value={
                      d.websiteUrl ? (
                        <a href={d.websiteUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          {d.websiteUrl}
                        </a>
                      ) : null
                    }
                  />
                </Section>

                <Section title="Location & contact">
                  <Field label="Address" value={d.line1} />
                  <Field label="City" value={d.city} />
                  <Field label="Coordinates" value={d.lat != null && d.lng != null ? `${d.lat}, ${d.lng}` : null} />
                  <Field label="Contact phone" value={d.contactPhone ? `+91 ${d.contactPhone}` : null} />
                </Section>

                {(d.responsiblePersonName || d.responsiblePersonPhone) && (
                  <Section title="Responsible person">
                    <Field label="Name" value={d.responsiblePersonName} />
                    <Field label="Role" value={d.responsiblePersonRole} />
                    <Field label="Phone" value={d.responsiblePersonPhone ? `+91 ${d.responsiblePersonPhone}` : null} />
                  </Section>
                )}

                <Section title="Stock">
                  {d.plantCategories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {d.plantCategories.map((c) => (
                        <Badge key={c} variant="secondary" className="font-normal">
                          {PLANT_CATEGORY_LABELS[c] || c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Field label="Approx. quantity available" value={d.approxPlantCount} />
                  <Field label="Seasonal availability" value={d.seasonalAvailability == null ? null : d.seasonalAvailability ? 'Yes' : 'No'} />
                  <Field label="Can supply bulk quantities" value={d.bulkSupply == null ? null : d.bulkSupply ? 'Yes' : 'No'} />
                </Section>

                {(d.gstin || d.businessRegistrationNumber || d.tradeLicenseNumber || d.ngoRegistrationNumber || d.governmentNurseryId) && (
                  <Section title="Business verification">
                    <Field label="GSTIN" value={d.gstin} />
                    <Field label="Business registration" value={d.businessRegistrationNumber} />
                    <Field label="Trade license" value={d.tradeLicenseNumber} />
                    <Field label="NGO registration" value={d.ngoRegistrationNumber} />
                    <Field label="Government nursery ID" value={d.governmentNurseryId} />
                  </Section>
                )}

                {d.reputation && (
                  <Section title="Reputation">
                    <Field
                      label="ARTH Trust Score"
                      value={d.reputation.trustScore == null ? 'Not yet verified' : d.reputation.trustScore}
                    />
                    {d.reputation.trustScoreFactors &&
                      Object.entries(d.reputation.trustScoreFactors).map(([key, value]) => (
                        <Field key={key} label={TRUST_FACTOR_LABELS[key] || key} value={value} />
                      ))}
                    <Field label="Growth Level" value={GROWTH_LEVEL_LABELS[d.reputation.growthLevel] || d.reputation.growthLevel} />
                    <Field label="Fulfilment streak" value={`${d.reputation.fulfilmentStreak.current} current · ${d.reputation.fulfilmentStreak.max} best`} />
                  </Section>
                )}

                <Section title="Account">
                  <Field label="Handle" value={d.owner?.handle ? `@${d.owner.handle}` : null} />
                  <Field label="Applied" value={new Date(d.createdAt).toLocaleString()} />
                </Section>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {d.status === 'pending' && (
                <>
                  <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {d.status === 'approved' && (
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </Button>
              )}
              {d.status === 'suspended' && (
                <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </Button>
              )}
              {d.status === 'rejected' && (
                <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                  <ShieldCheck className="h-4 w-4" /> Approve
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? confirmCopy[confirm].title : ''}
        description={confirm ? confirmCopy[confirm].body : ''}
        confirmLabel={confirm ? confirmCopy[confirm].confirmLabel : ''}
        destructive={confirm === 'reject' || confirm === 'suspend'}
        loading={working}
        onConfirm={runAction}
      >
        {(confirm === 'reject' || confirm === 'suspend') && (
          <label className="block">
            <span className="eyebrow">Reason (shown to the nursery)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'Approve this nursery?', confirmLabel: 'Approve', body: 'They can immediately start listing stock and taking orders.', status: 'approved' },
  reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
  suspend: { title: 'Suspend this nursery?', confirmLabel: 'Suspend', body: "They keep read access but can't publish anything new until reinstated.", status: 'suspended' },
  reinstate: { title: 'Reinstate this nursery?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
}

function RowActions({ nursery, onAction, onViewDetails }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const runAction = async () => {
    if (!confirm) return
    const { status } = CONFIRM_COPY[confirm]
    setWorking(true)
    try {
      await onAction(nursery.id, status, reason)
      toast.success(`Nursery ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {nursery.status === 'pending' && (
        <>
          <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
            <ShieldCheck className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('reject')}>
            <ShieldX className="h-3.5 w-3.5" /> Reject
          </Button>
        </>
      )}
      {nursery.status === 'approved' && (
        <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('suspend')}>
          <ShieldAlert className="h-3.5 w-3.5" /> Suspend
        </Button>
      )}
      {nursery.status === 'suspended' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('reinstate')}>
          <ShieldQuestion className="h-3.5 w-3.5" /> Reinstate
        </Button>
      )}
      {nursery.status === 'rejected' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
          <ShieldCheck className="h-3.5 w-3.5" /> Approve
        </Button>
      )}
      <Button size="sm" variant="ghost" className="rounded-full h-8" onClick={() => onViewDetails(nursery)}>
        Details
      </Button>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? CONFIRM_COPY[confirm].title : ''}
        description={confirm ? CONFIRM_COPY[confirm].body : ''}
        confirmLabel={confirm ? CONFIRM_COPY[confirm].confirmLabel : ''}
        destructive={confirm === 'reject' || confirm === 'suspend'}
        loading={working}
        onConfirm={runAction}
      >
        {(confirm === 'reject' || confirm === 'suspend') && (
          <label className="block">
            <span className="eyebrow">Reason (shown to the nursery)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default function AdminNurseriesClient() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [filter, setFilter] = useState(FILTERS.includes(initialStatus) ? initialStatus : 'pending')
  const [nurseries, setNurseries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/admin/nurseries?status=${filter}`)
      setNurseries(data.nurseries)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id, status, reason) => {
    await proxy(`/admin/nurseries/${id}/status`, { method: 'PATCH', body: { status, rejectionReason: reason || undefined } })
    await load()
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'nurseryName',
        header: 'Nursery',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.nurseryName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{row.original.description}</p>
          </div>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.owner?.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.owner?.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Applied',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <RowActions nursery={row.original} onAction={handleAction} onViewDetails={setSelected} />,
      },
    ],
    [handleAction],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Nurseries</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Approvals</h1>
      </div>

      <div className="flex gap-2 border-b border-border/70">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition ${
              filter === f ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={nurseries}
        loading={loading}
        searchKey="nurseryName"
        searchPlaceholder="Search nurseries…"
        emptyState={<EmptyState icon={Sprout} title={`No ${filter} nurseries`} body="Nothing to review here right now." />}
      />

      <NurseryDetailSheet nursery={selected} onOpenChange={(open) => !open && setSelected(null)} onAction={handleAction} />
    </DashboardPageShell>
  )
}

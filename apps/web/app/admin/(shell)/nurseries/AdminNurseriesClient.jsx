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

const STATUS_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }
const FILTERS = ['pending', 'approved', 'rejected', 'suspended']

function NurseryDetailSheet({ nursery, onOpenChange, onAction }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

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

  return (
    <>
      <Sheet open={Boolean(nursery)} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">{nursery.nurseryName}</SheetTitle>
            <SheetDescription>
              {nursery.owner?.name} · {nursery.owner?.email}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Badge variant={STATUS_VARIANT[nursery.status]} className="capitalize">
                {nursery.status}
              </Badge>
              {nursery.rejectionReason && <p className="mt-2 text-sm text-muted-foreground">Reason on file: &ldquo;{nursery.rejectionReason}&rdquo;</p>}
            </div>

            <p className="text-sm text-muted-foreground">{nursery.description}</p>
            {nursery.city && <p className="text-sm">{nursery.city}</p>}
            {nursery.contactPhone && <p className="text-sm text-muted-foreground">{nursery.contactPhone}</p>}

            <div className="flex flex-wrap gap-2">
              {nursery.status === 'pending' && (
                <>
                  <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {nursery.status === 'approved' && (
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </Button>
              )}
              {nursery.status === 'suspended' && (
                <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </Button>
              )}
              {nursery.status === 'rejected' && (
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

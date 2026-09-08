'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion } from 'lucide-react'
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

function CorporateDetailSheet({ corporate, onOpenChange, onAction }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const confirmCopy = {
    approve: { title: 'Approve this corporate account?', confirmLabel: 'Approve', body: 'They can immediately start sponsoring CSR activity.', status: 'approved' },
    reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
    suspend: { title: 'Suspend this account?', confirmLabel: 'Suspend', body: "They keep read access but can't publish anything new until reinstated.", status: 'suspended' },
    reinstate: { title: 'Reinstate this account?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
  }

  const runAction = async () => {
    if (!confirm) return
    const { status } = confirmCopy[confirm]
    setWorking(true)
    try {
      await onAction(corporate.id, status, reason)
      toast.success(`Corporate account ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  if (!corporate) return null

  return (
    <>
      <Sheet open={Boolean(corporate)} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">{corporate.companyName}</SheetTitle>
            <SheetDescription>
              {corporate.owner?.name} · {corporate.owner?.email}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Badge variant={STATUS_VARIANT[corporate.status]} className="capitalize">
                {corporate.status}
              </Badge>
              {corporate.rejectionReason && <p className="mt-2 text-sm text-muted-foreground">Reason on file: &ldquo;{corporate.rejectionReason}&rdquo;</p>}
            </div>

            <p className="text-sm text-muted-foreground">{corporate.description}</p>
            {corporate.industry && <p className="text-sm">{corporate.industry}</p>}
            {corporate.city && <p className="text-sm text-muted-foreground">{corporate.city}</p>}

            <div className="flex flex-wrap gap-2">
              {corporate.status === 'pending' && (
                <>
                  <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {corporate.status === 'approved' && (
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </Button>
              )}
              {corporate.status === 'suspended' && (
                <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </Button>
              )}
              {corporate.status === 'rejected' && (
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
            <span className="eyebrow">Reason (shown to the company)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'Approve this corporate account?', confirmLabel: 'Approve', body: 'They can immediately start sponsoring CSR activity.', status: 'approved' },
  reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
  suspend: { title: 'Suspend this account?', confirmLabel: 'Suspend', body: "They keep read access but can't publish anything new until reinstated.", status: 'suspended' },
  reinstate: { title: 'Reinstate this account?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
}

function RowActions({ corporate, onAction, onViewDetails }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const runAction = async () => {
    if (!confirm) return
    const { status } = CONFIRM_COPY[confirm]
    setWorking(true)
    try {
      await onAction(corporate.id, status, reason)
      toast.success(`Corporate account ${confirm === 'reinstate' ? 'reinstated' : status}.`)
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
      {corporate.status === 'pending' && (
        <>
          <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
            <ShieldCheck className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('reject')}>
            <ShieldX className="h-3.5 w-3.5" /> Reject
          </Button>
        </>
      )}
      {corporate.status === 'approved' && (
        <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('suspend')}>
          <ShieldAlert className="h-3.5 w-3.5" /> Suspend
        </Button>
      )}
      {corporate.status === 'suspended' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('reinstate')}>
          <ShieldQuestion className="h-3.5 w-3.5" /> Reinstate
        </Button>
      )}
      {corporate.status === 'rejected' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
          <ShieldCheck className="h-3.5 w-3.5" /> Approve
        </Button>
      )}
      <Button size="sm" variant="ghost" className="rounded-full h-8" onClick={() => onViewDetails(corporate)}>
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
            <span className="eyebrow">Reason (shown to the company)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default function AdminCorporatesClient() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [filter, setFilter] = useState(FILTERS.includes(initialStatus) ? initialStatus : 'pending')
  const [corporates, setCorporates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/admin/corporates?status=${filter}`)
      setCorporates(data.corporates)
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
    await proxy(`/admin/corporates/${id}/status`, { method: 'PATCH', body: { status, rejectionReason: reason || undefined } })
    await load()
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Company',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.companyName}</p>
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
        cell: ({ row }) => <RowActions corporate={row.original} onAction={handleAction} onViewDetails={setSelected} />,
      },
    ],
    [handleAction],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Corporates</p>
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
        data={corporates}
        loading={loading}
        searchKey="companyName"
        searchPlaceholder="Search companies…"
        emptyState={<EmptyState icon={Building2} title={`No ${filter} corporate accounts`} body="Nothing to review here right now." />}
      />

      <CorporateDetailSheet corporate={selected} onOpenChange={(open) => !open && setSelected(null)} onAction={handleAction} />
    </DashboardPageShell>
  )
}

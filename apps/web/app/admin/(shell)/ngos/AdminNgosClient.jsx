'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import StatTile from '@/components/dashboard/StatTile'

async function proxy(path, opts = {}) {
  const res = await fetch(`/api/admin/proxy${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong.')
  return data
}

const STATUS_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }
const FILTERS = ['pending', 'approved', 'rejected', 'suspended']

function NgoDetailSheet({ ngo, onOpenChange, onAction }) {
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [confirm, setConfirm] = useState(null) // 'approve' | 'reject' | 'suspend' | 'reinstate'
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!ngo) return
    setLoadingSummary(true)
    proxy(`/admin/ngos/${ngo.id}/summary`)
      .then(setSummary)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingSummary(false))
  }, [ngo])

  const confirmCopy = {
    approve: { title: 'Approve this NGO?', confirmLabel: 'Approve', body: 'They can immediately start publishing drives, trees, and campaigns.', status: 'approved' },
    reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
    suspend: { title: 'Suspend this NGO?', confirmLabel: 'Suspend', body: 'They keep read access to their history but can\'t publish anything new until reinstated.', status: 'suspended' },
    reinstate: { title: 'Reinstate this NGO?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
  }

  const runAction = async () => {
    if (!confirm) return
    const { status } = confirmCopy[confirm]
    setWorking(true)
    try {
      await onAction(ngo.id, status, reason)
      toast.success(`NGO ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  if (!ngo) return null

  return (
    <>
      <Sheet open={Boolean(ngo)} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">{ngo.orgName}</SheetTitle>
            <SheetDescription>
              {ngo.owner?.name} · {ngo.owner?.email}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Badge variant={STATUS_VARIANT[ngo.status]} className="capitalize">
                {ngo.status}
              </Badge>
              {ngo.rejectionReason && <p className="mt-2 text-sm text-muted-foreground">Reason on file: &ldquo;{ngo.rejectionReason}&rdquo;</p>}
            </div>

            <p className="text-sm text-muted-foreground">{ngo.description}</p>
            {ngo.website && (
              <p className="text-sm">
                <a href={ngo.website} target="_blank" rel="noreferrer" className="text-primary underline">
                  {ngo.website}
                </a>
              </p>
            )}
            {ngo.contactPhone && <p className="text-sm text-muted-foreground">{ngo.contactPhone}</p>}

            <div>
              <p className="eyebrow mb-3">Activity</p>
              {loadingSummary ? (
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Drives" value={summary.drivesCount} />
                  <StatTile label="Campaigns" value={summary.campaignsCount} />
                  <StatTile label="Trees listed" value={summary.treesCount} />
                  <StatTile label="Total raised" value={`₹${(summary.totalRaisedCents / 100).toLocaleString()}`} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {ngo.status === 'pending' && (
                <>
                  <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {ngo.status === 'approved' && (
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </Button>
              )}
              {ngo.status === 'suspended' && (
                <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </Button>
              )}
              {ngo.status === 'rejected' && (
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
            <span className="eyebrow">Reason (shown to the NGO)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </>
  )
}

export default function AdminNgosClient() {
  const [filter, setFilter] = useState('pending')
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/admin/ngos?status=${filter}`)
      setNgos(data.ngos)
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
    await proxy(`/admin/ngos/${id}/status`, { method: 'PATCH', body: { status, rejectionReason: reason || undefined } })
    await load()
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'orgName',
        header: 'Organization',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.orgName}</p>
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
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelected(row.original)}>View details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">NGOs</p>
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
        data={ngos}
        loading={loading}
        searchKey="orgName"
        searchPlaceholder="Search organizations…"
        emptyState={<EmptyState icon={ShieldCheck} title={`No ${filter} NGOs`} body="Nothing to review here right now." />}
      />

      <NgoDetailSheet ngo={selected} onOpenChange={(open) => !open && setSelected(null)} onAction={handleAction} />
    </DashboardPageShell>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../../../../NgoProfileContext'
import { proxy } from '../../../../proxy'
import { STATUS_LABELS, STATUS_VARIANT } from '../../../survivalFormat'
import TreeDetailSheet from './TreeDetailSheet'

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'struggling', label: 'Struggling' },
  { value: 'dead', label: 'Dead' },
  { value: 'removed', label: 'Removed' },
]

const STATUS_FILTERS = ['all', 'not_checked', 'healthy', 'struggling', 'dead', 'removed']

export default function TreesClient({ driveId, zoneId }) {
  const router = useRouter()
  const { profile } = useNgoProfile()
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)
  const [zoneInfo, setZoneInfo] = useState(null)
  const [trees, setTrees] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTrees, setSelectedTrees] = useState([])
  const [bulkStatus, setBulkStatus] = useState('healthy')
  const [applying, setApplying] = useState(false)
  const [openTreeId, setOpenTreeId] = useState(null)

  const isUnzoned = zoneId === 'unzoned'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [zoneRes, treesRes] = await Promise.all([
        isUnzoned ? Promise.resolve({ id: null, name: 'Unzoned' }) : proxy(`/ngo/planted-trees/zones/${zoneId}`),
        proxy(`/ngo/planted-trees?driveId=${driveId}&zoneId=${zoneId}&take=200`),
      ])
      setZoneInfo(zoneRes)
      setTrees(treesRes.trees)
    } catch (err) {
      toast.error(err.message || 'Could not load – please try again.')
    } finally {
      setLoading(false)
    }
  }, [driveId, zoneId, isUnzoned])

  useEffect(() => {
    load()
  }, [load])

  const filteredTrees = useMemo(
    () => (statusFilter === 'all' ? trees : trees.filter((t) => t.latestStatus === statusFilter)),
    [trees, statusFilter],
  )

  const handleApplyBulkStatus = guard(async () => {
    if (selectedTrees.length === 0) return
    setApplying(true)
    try {
      await proxy('/ngo/planted-trees/health-checks/bulk', {
        method: 'POST',
        body: { plantedTreeIds: selectedTrees.map((t) => t.id), status: bulkStatus },
      })
      toast.success(`Marked ${selectedTrees.length} trees as ${bulkStatus}.`)
      setSelectedTrees([])
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setApplying(false)
    }
  })

  const columns = useMemo(
    () => [
      {
        accessorKey: 'speciesName',
        header: 'Species',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.speciesName}</p>
            {row.original.label && <p className="text-xs text-muted-foreground mt-0.5">{row.original.label}</p>}
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.locationLabel || '–'}</span>,
      },
      {
        accessorKey: 'plantedAt',
        header: 'Planted',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.plantedAt).toLocaleDateString()}</span>,
      },
      {
        accessorKey: 'latestStatus',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.latestStatus]} className="capitalize">
            {STATUS_LABELS[row.original.latestStatus]}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <button
        type="button"
        onClick={() => router.push(`/ngo/dashboard/survival/${driveId}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to zones
      </button>

      <div>
        <p className="eyebrow text-primary">Zone</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">{zoneInfo?.name || '…'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select trees for exceptions, or tap one to see its full history.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === s ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {selectedTrees.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium">{selectedTrees.length} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="h-9 rounded-full border border-border/70 bg-background px-3 text-sm"
          >
            {HEALTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button size="sm" className="rounded-full" disabled={applying} onClick={handleApplyBulkStatus}>
            {applying ? 'Applying…' : `Mark as ${bulkStatus}`}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredTrees}
        loading={loading}
        searchKey="speciesName"
        searchPlaceholder="Search species…"
        enableRowSelection
        onSelectionChange={setSelectedTrees}
        onRowClick={(row) => setOpenTreeId(row.id)}
        emptyState={<EmptyState icon={TreePine} title="No trees match this filter" body="Try a different status filter." />}
      />

      <TreeDetailSheet
        treeId={openTreeId}
        open={openTreeId != null}
        onOpenChange={(next) => !next && setOpenTreeId(null)}
        onChanged={load}
        guard={guard}
      />

      <ApprovalGateDialog open={gateOpen} onOpenChange={setGateOpen} status={profile?.status} rejectionReason={profile?.rejectionReason} />
    </DashboardPageShell>
  )
}

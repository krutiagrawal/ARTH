'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Sprout, Plus, TreePine, HeartPulse, Skull, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import StatTile from '@/components/dashboard/StatTile'
import { proxy } from '../proxy'

const STATUS_VARIANT = { healthy: 'default', struggling: 'secondary', dead: 'destructive', removed: 'outline' }

const bulkLogFields = [
  { name: 'speciesName', label: 'Species', required: true, section: 'Details' },
  { name: 'count', label: 'Number of trees', type: 'number', required: true, section: 'Details' },
  { name: 'locationLabel', label: 'Location (optional)', section: 'Details' },
]

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'struggling', label: 'Struggling' },
  { value: 'dead', label: 'Dead' },
  { value: 'removed', label: 'Removed' },
]

export default function SurvivalClient() {
  const [trees, setTrees] = useState([])
  const [stats, setStats] = useState(null)
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTrees, setSelectedTrees] = useState([])
  const [bulkStatus, setBulkStatus] = useState('healthy')
  const [applying, setApplying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [treesRes, statsRes] = await Promise.all([
        proxy('/ngo/planted-trees'),
        proxy('/ngo/planted-trees/survival-stats'),
      ])
      setTrees(treesRes.trees)
      setStats(statsRes)
    } catch (err) {
      toast.error(err.message || 'Could not load – please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    proxy('/drives/mine').then(setDrives).catch(() => setDrives([]))
  }, [load])

  const fields = useMemo(
    () => [
      ...bulkLogFields,
      {
        name: 'driveId',
        label: 'Related drive (optional)',
        type: 'select',
        section: 'Details',
        placeholder: 'Not linked to a drive',
        options: drives.map((d) => ({ value: d.id, label: d.title })),
      },
    ],
    [drives],
  )

  const handleBulkLog = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      const body = new FormData()
      for (const [k, v] of Object.entries(payload)) body.append(k, v)
      if (photoFile) body.append('photo', photoFile)
      const result = await proxy('/ngo/planted-trees/bulk', { method: 'POST', body })
      toast.success(`Logged ${result.createdCount} trees.`)
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApplyBulkStatus = async () => {
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
  }

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
        id: 'drive',
        header: 'Drive',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.driveTitle || '–'}</span>,
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
          <Badge variant={STATUS_VARIANT[row.original.latestStatus] || 'outline'} className="capitalize">
            {row.original.latestStatus}
          </Badge>
        ),
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Survival & Impact</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Track what you&rsquo;ve planted</h1>
          <p className="mt-2 text-sm text-muted-foreground">Log trees after a drive, then check in on them over time.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> Log planted trees
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total logged" value={stats?.total ?? 0} icon={TreePine} loading={loading} />
        <StatTile label="Healthy" value={stats?.counts?.healthy ?? 0} icon={HeartPulse} loading={loading} />
        <StatTile label="Struggling" value={stats?.counts?.struggling ?? 0} icon={HelpCircle} tone="sand" loading={loading} />
        <StatTile label="Dead / removed" value={(stats?.counts?.dead ?? 0) + (stats?.counts?.removed ?? 0)} icon={Skull} tone="sand" loading={loading} />
      </div>

      {stats && (
        <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Sprout className="h-4 w-4" />
          </span>
          <div>
            <p className="font-serif text-xl leading-none">{stats.survivalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Survival rate – healthy or struggling trees out of everything logged.</p>
          </div>
        </div>
      )}

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
        data={trees}
        loading={loading}
        searchKey="speciesName"
        searchPlaceholder="Search species…"
        enableRowSelection
        onSelectionChange={setSelectedTrees}
        emptyState={
          <EmptyState icon={TreePine} title="No trees logged yet" body="After a drive, log how many trees you planted to start tracking survival." actionLabel="Log planted trees" onAction={() => setDialogOpen(true)} />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Log planted trees"
        description="Record trees planted after a drive – you can check in on their health later."
        icon={TreePine}
        fields={fields}
        item={null}
        photoLabel="Photo (optional)"
        submitting={submitting}
        onSubmit={handleBulkLog}
      />
    </DashboardPageShell>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sprout, Plus, TreePine, HeartPulse, Skull, HelpCircle, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import StatTile from '@/components/dashboard/StatTile'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../NgoProfileContext'
import { proxy } from '../proxy'
import { formatDueDate } from './survivalFormat'

const bulkLogFields = [
  { name: 'speciesName', label: 'Species', required: true, section: 'Details' },
  { name: 'count', label: 'Number of trees (max 200 per batch)', type: 'number', required: true, section: 'Details' },
  { name: 'locationLabel', label: 'Location (optional)', section: 'Details' },
]

export default function SurvivalClient() {
  const router = useRouter()
  const { profile } = useNgoProfile()
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)
  const [plantations, setPlantations] = useState([])
  const [stats, setStats] = useState(null)
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [plantationsRes, statsRes] = await Promise.all([
        proxy('/ngo/planted-trees/plantations'),
        proxy('/ngo/planted-trees/survival-stats'),
      ])
      setPlantations(plantationsRes.plantations)
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
        label: 'Plantation drive (optional)',
        type: 'select',
        section: 'Details',
        placeholder: 'Not linked to a drive',
        options: drives.map((d) => ({ value: d.id, label: d.title })),
      },
    ],
    [drives],
  )

  const handleBulkLog = async (payload, photoFile) => {
    if (!photoFile) {
      toast.error('A photo of the planting is required.')
      return
    }
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

  const columns = useMemo(
    () => [
      {
        accessorKey: 'driveTitle',
        header: 'Plantation',
        cell: ({ row }) => <p className="font-medium">{row.original.driveTitle}</p>,
      },
      {
        id: 'zones',
        header: 'Zones',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.zoneCount}</span>,
      },
      {
        accessorKey: 'total',
        header: 'Trees',
      },
      {
        id: 'survivalRate',
        header: 'Survival rate',
        cell: ({ row }) => <span>{row.original.survivalRate}%</span>,
      },
      {
        id: 'nextCheckDue',
        header: 'Next health check',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDueDate(row.original.nextCheckDue)}</span>,
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
          <p className="mt-2 text-sm text-muted-foreground">Manage plantations by zone, then check in on individual trees when needed.</p>
        </div>
        <Button onClick={guard(() => setDialogOpen(true))} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> Log planted trees
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatTile label="Total logged" value={stats?.total ?? 0} icon={TreePine} loading={loading} />
        <StatTile label="Not checked" value={stats?.counts?.not_checked ?? 0} icon={CircleDashed} tone="sand" loading={loading} />
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
            <p className="text-xs text-muted-foreground mt-1">Survival rate – healthy or struggling trees out of everything logged, including not-yet-checked ones.</p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={plantations}
        loading={loading}
        searchKey="driveTitle"
        searchPlaceholder="Search plantations…"
        onRowClick={(row) => router.push(`/ngo/dashboard/survival/${row.driveId}`)}
        emptyState={
          <EmptyState icon={TreePine} title="No trees logged yet" body="After a drive, log how many trees you planted to start tracking survival by zone." actionLabel="Log planted trees" onAction={guard(() => setDialogOpen(true))} />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Log planted trees"
        description="Record trees planted after a drive – open the plantation afterwards to organize them into zones."
        icon={TreePine}
        fields={fields}
        item={null}
        photoLabel="Photo (required)"
        submitting={submitting}
        onSubmit={handleBulkLog}
      />

      <ApprovalGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        status={profile?.status}
        rejectionReason={profile?.rejectionReason}
      />
    </DashboardPageShell>
  )
}

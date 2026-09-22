'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Boxes, ChevronRight, Plus, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../../NgoProfileContext'
import { proxy } from '../../proxy'
import { formatDueDate } from '../survivalFormat'

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'struggling', label: 'Struggling' },
  { value: 'dead', label: 'Dead' },
  { value: 'removed', label: 'Removed' },
]

function ZoneStatusPicker({ zoneId, onApplied, guard }) {
  const [status, setStatus] = useState('healthy')
  const [applying, setApplying] = useState(false)

  const apply = guard(async () => {
    setApplying(true)
    try {
      const result = await proxy(`/ngo/planted-trees/zones/${zoneId}/health-checks/bulk`, { method: 'POST', body: { status } })
      toast.success(`Marked ${result.updatedCount} trees as ${status}.`)
      await onApplied()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setApplying(false)
    }
  })

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-8 rounded-full border border-border/70 bg-background px-2.5 text-xs"
      >
        {HEALTH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" className="rounded-full h-8" disabled={applying} onClick={apply}>
        {applying ? 'Marking…' : 'Mark zone'}
      </Button>
    </div>
  )
}

export default function ZonesClient({ driveId }) {
  const router = useRouter()
  const { profile } = useNgoProfile()
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)
  const [drive, setDrive] = useState(null)
  const [zones, setZones] = useState([])
  const [unzoned, setUnzoned] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newZoneOpen, setNewZoneOpen] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [creatingZone, setCreatingZone] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/ngo/planted-trees/zones?driveId=${driveId}`)
      setDrive(data.drive)
      setZones(data.zones)
      setUnzoned(data.unzoned)
    } catch (err) {
      toast.error(err.message || 'Could not load – please try again.')
    } finally {
      setLoading(false)
    }
  }, [driveId])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => (unzoned ? [...zones, unzoned] : zones), [zones, unzoned])

  const createZone = guard(async () => {
    if (!newZoneName.trim()) return
    setCreatingZone(true)
    try {
      await proxy('/ngo/planted-trees/zones', { method: 'POST', body: { driveId, name: newZoneName.trim() } })
      toast.success('Zone created.')
      setNewZoneOpen(false)
      setNewZoneName('')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setCreatingZone(false)
    }
  })

  const logFields = useMemo(
    () => [
      { name: 'speciesName', label: 'Species', required: true, section: 'Details' },
      { name: 'count', label: 'Number of trees', type: 'number', required: true, section: 'Details' },
      { name: 'locationLabel', label: 'Location (optional)', section: 'Details' },
      {
        name: 'zoneId',
        label: 'Zone (optional)',
        type: 'select',
        section: 'Details',
        placeholder: 'Unzoned',
        options: zones.map((z) => ({ value: z.id, label: z.name })),
      },
    ],
    [zones],
  )

  const handleBulkLog = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      const body = new FormData()
      for (const [k, v] of Object.entries(payload)) body.append(k, v)
      body.append('driveId', driveId)
      if (photoFile) body.append('photo', photoFile)
      const result = await proxy('/ngo/planted-trees/bulk', { method: 'POST', body })
      toast.success(`Logged ${result.createdCount} trees.`)
      setLogOpen(false)
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
        accessorKey: 'name',
        header: 'Zone',
        cell: ({ row }) => <p className="font-medium">{row.original.name}</p>,
      },
      { accessorKey: 'total', header: 'Trees' },
      {
        id: 'breakdown',
        header: 'Healthy / Struggling / Dead / Removed',
        cell: ({ row }) => {
          const c = row.original.counts
          return (
            <span className="text-sm text-muted-foreground">
              {c.healthy} / {c.struggling} / {c.dead} / {c.removed}
              {c.not_checked > 0 && <span className="ml-1.5 text-xs">({c.not_checked} not checked)</span>}
            </span>
          )
        },
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
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.id ? (
            <ZoneStatusPicker zoneId={row.original.id} onApplied={load} guard={guard} />
          ) : (
            <span className="text-xs text-muted-foreground italic">Assign to a zone to bulk-check</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <button
        type="button"
        onClick={() => router.push('/ngo/dashboard/survival')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All plantations
      </button>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Plantation</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">{drive?.title || '…'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Mark a whole zone healthy in one tap, then fix up any exceptions individually.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={guard(() => setNewZoneOpen(true))} className="rounded-full">
            <Boxes className="h-4 w-4" /> New zone
          </Button>
          <Button onClick={guard(() => setLogOpen(true))} className="rounded-full">
            <Plus className="h-4 w-4" /> Log trees
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        onRowClick={(row) => router.push(`/ngo/dashboard/survival/${driveId}/zones/${row.id ?? 'unzoned'}`)}
        emptyState={
          <EmptyState
            icon={TreePine}
            title="No trees logged for this plantation yet"
            body="Log planted trees and organize them into zones so health checks stay fast."
            actionLabel="Log trees"
            onAction={guard(() => setLogOpen(true))}
          />
        }
      />

      {!loading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          Tap a zone to see individual trees <ChevronRight className="h-3 w-3" />
        </p>
      )}

      <Dialog open={newZoneOpen} onOpenChange={setNewZoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New zone</DialogTitle>
            <DialogDescription>e.g. "Zone A", "Roadside", "School Boundary"</DialogDescription>
          </DialogHeader>
          <Input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="Zone name" maxLength={100} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewZoneOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creatingZone || !newZoneName.trim()} onClick={createZone}>
              {creatingZone ? 'Creating…' : 'Create zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResourceFormSheet
        open={logOpen}
        onOpenChange={setLogOpen}
        title="Log planted trees"
        description={`Record trees planted in ${drive?.title || 'this plantation'}, optionally into a zone.`}
        icon={TreePine}
        fields={logFields}
        item={null}
        photoLabel="Photo (optional)"
        submitting={submitting}
        onSubmit={handleBulkLog}
      />

      <ApprovalGateDialog open={gateOpen} onOpenChange={setGateOpen} status={profile?.status} rejectionReason={profile?.rejectionReason} />
    </DashboardPageShell>
  )
}

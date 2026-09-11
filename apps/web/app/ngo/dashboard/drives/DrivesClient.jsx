'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Users, MapPin, CalendarDays, Sprout, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import DriveFormSheet from '@/components/dashboard/DriveFormSheet'
import DriveDetailSheet from './DriveDetailSheet'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../NgoProfileContext'
import { useResourceCrud } from '../useResourceCrud'

const STATUS_VARIANT = { upcoming: 'default', completed: 'secondary', cancelled: 'destructive' }
const TRANSPORT_LABEL = { self_arrange: 'Self-arrange', ngo_provided: 'NGO transport' }

export default function DrivesClient() {
  const { profile } = useNgoProfile()
  const { items, loading, create, update, remove, runAction } = useResourceCrud('/drives')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailFor, setDetailFor] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type: 'cancel' | 'complete', drive }

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (drive) => {
    setDetailFor(null)
    setEditing(drive)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      if (editing) {
        await update(editing.id, payload, photoFile)
        toast.success('Drive updated.')
      } else {
        await create(payload, photoFile)
        toast.success('Drive created.')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.type === 'cancel') {
        await remove(confirm.drive.id)
        toast.success('Drive cancelled.')
      } else {
        await runAction(confirm.drive.id, 'complete')
        toast.success('Drive marked completed.')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setConfirm(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Drive',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" /> {[row.original.address, row.original.city].filter(Boolean).join(', ') || 'No address set'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'startsAt',
        header: 'Starts',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-sm">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(row.original.startsAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'transportMode',
        header: 'Transport',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Navigation className="h-3.5 w-3.5" /> {TRANSPORT_LABEL[row.original.transportMode] || '–'}
          </span>
        ),
      },
      {
        id: 'plants',
        header: 'Plants',
        cell: ({ row }) => {
          const plants = row.original.plants ?? []
          if (plants.length === 0) return <span className="text-xs text-muted-foreground">–</span>
          const sponsored = plants.reduce((sum, p) => sum + p.sponsoredCount, 0)
          return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sprout className="h-3.5 w-3.5" /> {plants.length} listed · {sponsored} sponsored
            </span>
          )
        },
      },
      {
        accessorKey: 'confirmedCount',
        header: 'RSVPs',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {row.original.confirmedCount}
            {row.original.capacity != null ? ` / ${row.original.capacity}` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] || 'outline'} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'createdAt',
        header: 'Published',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '–'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const drive = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(drive))}>
                  Edit
                </DropdownMenuItem>
                {drive.status === 'upcoming' && (
                  <DropdownMenuItem onClick={guard(() => setConfirm({ type: 'complete', drive }))}>
                    Mark completed
                  </DropdownMenuItem>
                )}
                {drive.status === 'upcoming' && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={guard(() => setConfirm({ type: 'cancel', drive }))}
                  >
                    Cancel drive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [guard],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Drives</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Planting drives</h1>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New drive
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="title"
        searchPlaceholder="Search drives…"
        onRowClick={setDetailFor}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="No drives yet"
            body="Create your first planting drive to start collecting RSVPs from volunteers."
            actionLabel="New drive"
            onAction={guard(openCreate)}
          />
        }
      />

      <DriveFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <DriveDetailSheet drive={detailFor} onOpenChange={(open) => !open && setDetailFor(null)} onEdit={guard(openEdit)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.type === 'cancel' ? 'Cancel this drive?' : 'Mark this drive completed?'}
        description={
          confirm?.type === 'cancel'
            ? 'Volunteers who RSVP\'d will no longer see this drive as upcoming. This cannot be undone.'
            : 'This moves the drive out of "upcoming" – do this once the drive has actually happened.'
        }
        confirmLabel={confirm?.type === 'cancel' ? 'Cancel drive' : 'Mark completed'}
        destructive={confirm?.type === 'cancel'}
        onConfirm={handleConfirm}
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

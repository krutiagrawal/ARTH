'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, TreePine, MapPin, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import TreeDetailSheet from './TreeDetailSheet'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../NgoProfileContext'
import { useResourceCrud } from '@/lib/useResourceCrud'
import { proxy } from '../proxy'
import { treeFields } from '../resourceFields'

const STATUS_VARIANT = { available: 'secondary', adopted: 'default', removed: 'outline' }

export default function TreesClient() {
  const { profile } = useNgoProfile()
  const { items, loading, create, update, remove, runAction } = useResourceCrud(proxy, '/adoptable-trees')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [releasing, setReleasing] = useState(null)
  const [releaseReason, setReleaseReason] = useState('')
  const [detailFor, setDetailFor] = useState(null)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (tree) => {
    setDetailFor(null)
    setEditing(tree)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      if (editing) {
        await update(editing.id, payload, photoFile)
        toast.success('Tree updated.')
      } else {
        await create(payload, photoFile)
        toast.success('Tree listed for adoption.')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRelease = async () => {
    if (!releasing) return
    try {
      await runAction(releasing.id, 'release', releaseReason ? { reason: releaseReason } : undefined)
      toast.success('Adoption released – this tree is available again.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setReleasing(null)
      setReleaseReason('')
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'nickname',
        header: 'Tree',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.nickname}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.speciesName}</p>
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {[row.original.location, row.original.city].filter(Boolean).join(', ') || 'No location set'}
          </span>
        ),
      },
      {
        id: 'adopter',
        header: 'Adopter',
        cell: ({ row }) =>
          row.original.adopter ? (
            <div>
              <p className="text-sm">{row.original.adopter.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.adopter.handle}</p>
              {row.original.adopter.message && (
                <p className="text-xs text-muted-foreground italic mt-0.5 max-w-[180px] truncate">
                  &ldquo;{row.original.adopter.message}&rdquo;
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">–</span>
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
        header: 'Listed',
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
          const tree = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(tree))}>
                  Edit
                </DropdownMenuItem>
                {tree.status === 'adopted' && (
                  <DropdownMenuItem onClick={guard(() => setReleasing(tree))}>
                    Release adoption
                  </DropdownMenuItem>
                )}
                {tree.status !== 'removed' && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={guard(() => remove(tree.id).then(() => toast.success('Tree removed.')).catch((err) => toast.error(err.message)))}
                  >
                    Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [guard, remove],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Adoptable trees</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Trees for adoption</h1>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New tree
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="nickname"
        searchPlaceholder="Search trees…"
        onRowClick={setDetailFor}
        emptyState={
          <EmptyState
            icon={TreePine}
            title="No adoptable trees yet"
            body="List a tree for the community to adopt – they'll be able to leave a message when they do."
            actionLabel="New tree"
            onAction={guard(openCreate)}
          />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit tree' : 'New adoptable tree'}
        description={editing ? 'Update this tree\'s listing.' : 'List a tree for the community to adopt.'}
        icon={TreePine}
        fields={treeFields}
        item={editing}
        photoLabel="Photo"
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(releasing)}
        onOpenChange={(open) => {
          if (!open) {
            setReleasing(null)
            setReleaseReason('')
          }
        }}
        title="Release this adoption?"
        description="The tree goes back to available for someone else to adopt. The current adopter won't be notified automatically."
        confirmLabel="Release adoption"
        destructive
        onConfirm={handleRelease}
      >
        <label className="block">
          <span className="eyebrow flex items-center gap-1"><Heart className="h-3 w-3" /> Reason (optional, for your records)</span>
          <Textarea value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} rows={2} className="mt-2" />
        </label>
      </ConfirmDialog>

      <TreeDetailSheet tree={detailFor} onOpenChange={(open) => !open && setDetailFor(null)} onEdit={guard(openEdit)} />

      <ApprovalGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        status={profile?.status}
        rejectionReason={profile?.rejectionReason}
      />
    </DashboardPageShell>
  )
}

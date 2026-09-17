'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNurseryProfile } from '../NurseryProfileContext'
import { useResourceCrud } from '@/lib/useResourceCrud'
import { proxy } from '../proxy'
import { deliveryPartnerCreateFields, deliveryPartnerEditFields } from '../resourceFields'

export default function DeliveryPartnersClient() {
  const { profile } = useNurseryProfile()
  const { items, loading, create, update, runAction } = useResourceCrud(proxy, '/nursery/delivery-partners', '/nursery/delivery-partners')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (partner) => {
    setEditing(partner)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    try {
      if (editing) {
        await update(editing.id, payload)
        toast.success('Delivery partner updated.')
      } else {
        await create(payload)
        toast.success('Delivery partner added.')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await runAction(deactivateTarget.id, 'deactivate')
      toast.success('Deactivated.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setDeactivateTarget(null)
    }
  }

  const reactivate = async (partner) => {
    try {
      await update(partner.id, { isActive: true })
      toast.success('Reactivated.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.activeOrderCount} active order{row.original.activeOrderCount === 1 ? '' : 's'}</p>
          </div>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <p>{row.original.email}</p>
            <p>{row.original.phone}</p>
          </div>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.avgRating != null ? `★ ${Number(row.original.avgRating).toFixed(1)}` : '—'}</span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'default' : 'outline'}>{row.original.isActive ? 'Active' : 'Deactivated'}</Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const partner = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(partner))}>Edit</DropdownMenuItem>
                {partner.isActive ? (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={guard(() => setDeactivateTarget(partner))}>
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={guard(() => reactivate(partner))}>Reactivate</DropdownMenuItem>
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
          <p className="eyebrow text-primary">Delivery Partners</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Your riders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Riders who deliver your orders — add one to assign deliveries and let customers track them live.</p>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> Add delivery partner
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="name"
        searchPlaceholder="Search delivery partners…"
        emptyState={
          <EmptyState
            icon={Truck}
            title="No delivery partners yet"
            body="Add a rider so you can assign deliveries to them and let customers track their sapling live."
            actionLabel="Add a delivery partner"
            onAction={guard(openCreate)}
          />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit delivery partner' : 'Add delivery partner'}
        description={
          editing
            ? 'Update their name or phone number.'
            : 'They can log in on their own phone with this email and password — share it with them directly.'
        }
        icon={Truck}
        eyebrow="Nursery Dashboard"
        fields={editing ? deliveryPartnerEditFields : deliveryPartnerCreateFields}
        item={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this delivery partner?"
        description="They will no longer be assignable to new orders, but any delivery already in progress keeps working."
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
      />

      <ApprovalGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        status={profile?.status}
        rejectionReason={profile?.rejectionReason}
        entityLabel="nursery"
      />
    </DashboardPageShell>
  )
}

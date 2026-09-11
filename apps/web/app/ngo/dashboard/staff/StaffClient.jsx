'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../NgoProfileContext'
import { useResourceCrud } from '@/lib/useResourceCrud'
import { proxy } from '../proxy'
import { staffFields } from '../resourceFields'

export default function StaffClient() {
  const { profile } = useNgoProfile()
  const { items, loading, create, update, remove } = useResourceCrud(proxy, '/ngo/staff', '/ngo/staff')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (staff) => {
    setEditing(staff)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      if (editing) {
        await update(editing.id, payload, photoFile)
        toast.success('Staff member updated.')
      } else {
        await create(payload, photoFile)
        toast.success('Staff member added.')
      }
      setDialogOpen(false)
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
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.role}</p>
          </div>
        ),
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.contactEmail && <p>{row.original.contactEmail}</p>}
            {row.original.contactPhone && <p>{row.original.contactPhone}</p>}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const staff = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(staff))}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={guard(() => remove(staff.id).then(() => toast.success('Removed.')).catch((err) => toast.error(err.message)))}
                >
                  Remove
                </DropdownMenuItem>
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
          <p className="eyebrow text-primary">Staff</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Your team</h1>
          <p className="mt-2 text-sm text-muted-foreground">A roster of staff and coordinators – for your own records, not separate logins.</p>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="name"
        searchPlaceholder="Search staff…"
        emptyState={
          <EmptyState icon={Users} title="No staff added yet" body="Add coordinators and field staff to keep a roster on file." actionLabel="Add staff" onAction={guard(openCreate)} />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit staff member' : 'Add staff member'}
        description={editing ? 'Update their details.' : 'Add a coordinator or field staff member to your roster.'}
        icon={Users}
        fields={staffFields}
        item={editing}
        photoLabel="Photo"
        submitting={submitting}
        onSubmit={handleSubmit}
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

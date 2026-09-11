'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { resolveMediaUrl } from '@/lib/media'
import { useNurseryProfile } from '../NurseryProfileContext'
import { useResourceCrud } from '@/lib/useResourceCrud'
import { proxy } from '../proxy'
import InventoryFormSheet from './InventoryFormSheet'

const AVAILABILITY_VARIANT = { available: 'default', low_stock: 'secondary', out_of_stock: 'destructive' }
const AVAILABILITY_LABEL = { available: 'Available', low_stock: 'Low stock', out_of_stock: 'Out of stock' }

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

// Sends JSON when there's no photo (so the inline `species` object/array fields
// go through as real JSON, not stringified form fields) and multipart only when
// a photo file is attached — per the brief's create/update contract for /nursery/stock.
async function submitStock(path, method, payload, photoFile) {
  if (photoFile) {
    const body = new FormData()
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined || v === null || v === '') continue
      body.append(k, typeof v === 'object' ? JSON.stringify(v) : v)
    }
    body.append('photo', photoFile)
    return proxy(path, { method, body })
  }
  return proxy(path, { method, body: payload })
}

export default function InventoryClient() {
  const { profile } = useNurseryProfile()
  const { items, loading, load, remove } = useResourceCrud(proxy, '/nursery/stock', '/nursery/stock')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (row) => {
    setEditing(row)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      if (editing) {
        await submitStock(`/nursery/stock/${editing.id}`, 'PATCH', payload, photoFile)
        toast.success('Stock updated.')
      } else {
        await submitStock('/nursery/stock', 'POST', payload, photoFile)
        toast.success('Stock added.')
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await remove(confirmDelete.id)
      toast.success('Removed from inventory.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setConfirmDelete(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        id: 'species',
        header: 'Species',
        cell: ({ row }) => {
          const s = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-lg">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(s.photoUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  s.speciesRef?.emoji || '🌱'
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{s.speciesRef?.commonName || 'Unnamed species'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[s.ageLabel, s.heightLabel, s.potSize].filter(Boolean).join(' · ') || (s.speciesRef?.isNative ? 'Native' : '')}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => <span className="text-sm">{row.original.quantity}</span>,
      },
      {
        id: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.isFree ? 'Free' : rupees(row.original.priceCents)}</span>
        ),
      },
      {
        id: 'availabilityStatus',
        header: 'Availability',
        cell: ({ row }) => (
          <Badge variant={AVAILABILITY_VARIANT[row.original.availabilityStatus] || 'outline'}>
            {AVAILABILITY_LABEL[row.original.availabilityStatus] || row.original.availabilityStatus}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(item))}>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={guard(() => setConfirmDelete(item))}>
                  Remove
                </DropdownMenuItem>
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
          <p className="eyebrow text-primary">Inventory</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Your stock</h1>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> Add stock
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            icon={Sprout}
            title="No stock listed yet"
            body="Add the species you have on hand so buyers and NGOs can find them."
            actionLabel="Add stock"
            onAction={guard(openCreate)}
          />
        }
      />

      <InventoryFormSheet open={dialogOpen} onOpenChange={setDialogOpen} item={editing} submitting={submitting} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Remove this listing?"
        description="It will no longer show up for buyers or in nearby-stock recommendations."
        confirmLabel="Remove"
        destructive
        onConfirm={handleDelete}
      />

      <ApprovalGateDialog open={gateOpen} onOpenChange={setGateOpen} status={profile?.status} rejectionReason={profile?.rejectionReason} entityLabel="Nursery" />
    </DashboardPageShell>
  )
}

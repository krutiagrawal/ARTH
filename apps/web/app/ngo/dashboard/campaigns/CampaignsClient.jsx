'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Plus, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import CampaignDetailSheet from './CampaignDetailSheet'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import ApprovalGateDialog from '@/components/dashboard/ApprovalGateDialog'
import { useApprovalGate } from '@/components/dashboard/useApprovalGate'
import { useNgoProfile } from '../NgoProfileContext'
import { useResourceCrud } from '../useResourceCrud'
import { campaignFields } from '../resourceFields'

const STATUS_VARIANT = { active: 'default', closed: 'secondary' }

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString()}`
}

export default function CampaignsClient() {
  const { profile } = useNgoProfile()
  const { items, loading, create, update, remove, runAction } = useResourceCrud('/campaigns')
  const { open: gateOpen, setOpen: setGateOpen, guard } = useApprovalGate(profile?.status)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailFor, setDetailFor] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type: 'close' | 'reopen', campaign }

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (campaign) => {
    setDetailFor(null)
    setEditing(campaign)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload, photoFile) => {
    setSubmitting(true)
    try {
      if (editing) {
        await update(editing.id, payload, photoFile, 'photo')
        toast.success('Campaign updated.')
      } else {
        await create(payload, photoFile, 'photo')
        toast.success('Campaign created.')
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
      if (confirm.type === 'close') {
        await remove(confirm.campaign.id)
        toast.success('Campaign closed.')
      } else {
        await runAction(confirm.campaign.id, 'reopen')
        toast.success('Campaign reopened.')
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
        header: 'Campaign',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{row.original.description}</p>
          </div>
        ),
      },
      {
        id: 'progress',
        header: 'Raised',
        cell: ({ row }) => {
          const c = row.original
          const pct = c.goalAmountCents ? Math.min(100, Math.round((c.raisedAmountCents / c.goalAmountCents) * 100)) : null
          return (
            <div className="min-w-[140px]">
              <p className="flex items-center gap-1 text-sm">
                <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                {rupees(c.raisedAmountCents)}
                {c.goalAmountCents ? ` of ${rupees(c.goalAmountCents)}` : ''}
              </p>
              {pct !== null && <Progress value={pct} className="h-1.5 mt-1.5" />}
            </div>
          )
        },
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
        header: 'Started',
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
          const campaign = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={guard(() => openEdit(campaign))}>
                  Edit
                </DropdownMenuItem>
                {campaign.status === 'active' ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={guard(() => setConfirm({ type: 'close', campaign }))}
                  >
                    Close campaign
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={guard(() => setConfirm({ type: 'reopen', campaign }))}>
                    Reopen campaign
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
          <p className="eyebrow text-primary">Campaigns</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Donation campaigns</h1>
        </div>
        <Button onClick={guard(openCreate)} className="rounded-full shrink-0">
          <Plus className="h-4 w-4" /> New campaign
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchKey="title"
        searchPlaceholder="Search campaigns…"
        onRowClick={setDetailFor}
        emptyState={
          <EmptyState
            icon={Heart}
            title="No donation campaigns yet"
            body="Start a campaign to collect donations toward a goal – you'll see every donor here as they give."
            actionLabel="New campaign"
            onAction={guard(openCreate)}
          />
        }
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? 'Edit campaign' : 'New campaign'}
        description={editing ? 'Update this campaign\'s details.' : 'Start a campaign to collect donations toward a goal.'}
        icon={Heart}
        fields={campaignFields}
        item={editing}
        photoLabel="Cover photo"
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <CampaignDetailSheet campaign={detailFor} onOpenChange={(open) => !open && setDetailFor(null)} onEdit={guard(openEdit)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.type === 'close' ? 'Close this campaign?' : 'Reopen this campaign?'}
        description={
          confirm?.type === 'close'
            ? 'Donors will no longer be able to give to this campaign. You can reopen it later.'
            : 'This campaign will accept new donations again.'
        }
        confirmLabel={confirm?.type === 'close' ? 'Close campaign' : 'Reopen campaign'}
        destructive={confirm?.type === 'close'}
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

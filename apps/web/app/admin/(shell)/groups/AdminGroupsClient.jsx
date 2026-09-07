'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Users, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'

const STATUS_VARIANT = { active: 'default', suspended: 'secondary' }

export default function AdminGroupsClient() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null) // { group, nextStatus }
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy('/admin/groups')
      setGroups(data.groups)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async () => {
    if (!confirm) return
    setWorking(true)
    try {
      await proxy(`/admin/groups/${confirm.group.id}/status`, { method: 'PATCH', body: { status: confirm.nextStatus } })
      toast.success(`Group ${confirm.nextStatus}.`)
      setConfirm(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'groupName',
        header: 'Group',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.groupName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate capitalize">{row.original.groupType}</p>
          </div>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.owner?.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.owner?.email}</p>
          </div>
        ),
      },
      { accessorKey: 'memberCount', header: 'Members' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.status === 'active' ? (
                <DropdownMenuItem onClick={() => setConfirm({ group: row.original, nextStatus: 'suspended' })}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setConfirm({ group: row.original, nextStatus: 'active' })}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Groups</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Groups</h1>
        <p className="mt-2 text-sm text-muted-foreground">Groups are self-serve — no approval queue. Suspend one if it needs moderating.</p>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        searchKey="groupName"
        searchPlaceholder="Search groups…"
        emptyState={<EmptyState icon={Users} title="No groups yet" body="Groups will show up here once people start creating them." />}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.nextStatus === 'suspended' ? 'Suspend this group?' : 'Reinstate this group?'}
        description={
          confirm?.nextStatus === 'suspended'
            ? "Members keep read access but the group can't be used until reinstated."
            : 'The group regains full access.'
        }
        confirmLabel={confirm?.nextStatus === 'suspended' ? 'Suspend' : 'Reinstate'}
        destructive={confirm?.nextStatus === 'suspended'}
        loading={working}
        onConfirm={runAction}
      />
    </DashboardPageShell>
  )
}

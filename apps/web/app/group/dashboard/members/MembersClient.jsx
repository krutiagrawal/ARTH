'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Users, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '../proxy'

const ROLE_LABEL = { owner: 'Owner', co_admin: 'Co-admin', member: 'Member' }

export default function MembersClient() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [working, setWorking] = useState(false)

  const load = () => {
    setLoading(true)
    proxy('/group/members').then(setMembers).catch(() => setMembers([])).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const setRole = async (userId, role) => {
    try {
      await proxy(`/group/members/${userId}/role`, { method: 'PATCH', body: { role } })
      toast.success('Role updated.')
      load()
    } catch (err) {
      toast.error(err.message || 'Could not update role.')
    }
  }

  const removeMember = async () => {
    setWorking(true)
    try {
      await proxy(`/group/members/${confirm.userId}`, { method: 'DELETE' })
      toast.success('Member removed.')
      setConfirm(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Could not remove this member.')
    } finally {
      setWorking(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Member',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.avatarEmoji}</span>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">@{row.original.handle}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <Badge variant={row.original.role === 'owner' ? 'default' : 'outline'}>{ROLE_LABEL[row.original.role]}</Badge>,
      },
      {
        accessorKey: 'treesPlantedCount',
        header: 'Trees planted',
      },
      {
        accessorKey: 'xp',
        header: 'XP',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          if (row.original.role === 'owner') return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.original.role === 'member' ? (
                  <DropdownMenuItem onClick={() => setRole(row.original.userId, 'co_admin')}>Make co-admin</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setRole(row.original.userId, 'member')}>Remove co-admin</DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => setConfirm({ userId: row.original.userId, name: row.original.name })}>
                  Remove from group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Members</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Your group</h1>
      </div>

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        searchKey="name"
        searchPlaceholder="Search members…"
        emptyState={<EmptyState icon={Users} title="No members yet" body="Share your invite code from the Overview page to bring people in." />}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Remove member?"
        description={confirm ? `${confirm.name} will lose access to this group's challenges and combined stats.` : ''}
        confirmLabel="Remove"
        destructive
        loading={working}
        onConfirm={removeMember}
      />
    </DashboardPageShell>
  )
}

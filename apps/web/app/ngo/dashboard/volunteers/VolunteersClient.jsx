'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '../proxy'

export default function VolunteersClient() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    proxy('/ngo/volunteers')
      .then(setVolunteers)
      .catch(() => setVolunteers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRemove = async (volunteer) => {
    setRemovingId(volunteer.userId)
    try {
      await proxy(`/ngo/volunteers/${volunteer.userId}`, { method: 'DELETE' })
      toast.success(`Cancelled ${volunteer.name}'s upcoming RSVPs.`)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setRemovingId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Volunteer',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.handle}</p>
          </div>
        ),
      },
      {
        accessorKey: 'drivesAttended',
        header: 'Drives attended',
        cell: ({ row }) => <Badge variant="outline">{row.original.drivesAttended}</Badge>,
      },
      {
        accessorKey: 'lastActiveAt',
        header: 'Last active',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleDateString() : '–'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const volunteer = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" disabled={removingId === volunteer.userId}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemove(volunteer)}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [removingId],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Volunteers</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Your volunteers</h1>
        <p className="mt-2 text-sm text-muted-foreground">Everyone who has RSVP&rsquo;d to one of your drives.</p>
      </div>

      <DataTable
        columns={columns}
        data={volunteers}
        loading={loading}
        searchKey="name"
        searchPlaceholder="Search volunteers…"
        emptyState={
          <EmptyState
            icon={Users}
            title="No volunteers yet"
            body="Once people RSVP to your drives, they'll show up here."
          />
        }
      />
    </DashboardPageShell>
  )
}

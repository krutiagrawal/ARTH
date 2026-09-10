'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '../proxy'

export default function VolunteersClient() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/ngo/volunteers')
      .then(setVolunteers)
      .catch(() => setVolunteers([]))
      .finally(() => setLoading(false))
  }, [])

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
    ],
    [],
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

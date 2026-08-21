'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Flag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'

export default function CompetitionModerationClient() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/competitions')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not load entries.')
        return res.json()
      })
      .then((data) => setEntries(data.entries))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await fetch(`/api/admin/competitions/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete entry.')
      toast.success('Entry deleted.')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Entry',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{row.original.description}</p>
          </div>
        ),
      },
      { accessorKey: 'competitionTitle', header: 'Competition' },
      { accessorKey: 'entrant', header: 'Entrant' },
      { accessorKey: 'votes', header: 'Votes' },
      {
        accessorKey: 'createdAt',
        header: 'Submitted',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:text-destructive" onClick={() => setDeleting(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Content</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Competition entries</h1>
        <p className="mt-2 text-sm text-muted-foreground">Remove entries that violate guidelines. This can&rsquo;t be undone.</p>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        loading={loading}
        searchKey="title"
        searchPlaceholder="Search entries…"
        emptyState={<EmptyState icon={Flag} title="No entries yet" body="Competition submissions will show up here for moderation." />}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this entry?"
        description="This permanently removes the entry and its votes."
        confirmLabel="Delete entry"
        destructive
        onConfirm={handleDelete}
      />
    </DashboardPageShell>
  )
}

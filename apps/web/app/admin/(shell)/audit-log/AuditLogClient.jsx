'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ScrollText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'

const ACTION_VARIANT = {
  'ngo.approved': 'default',
  'ngo.reinstated': 'default',
  'ngo.rejected': 'destructive',
  'ngo.suspended': 'destructive',
}

async function proxy(path) {
  const res = await fetch(`/api/admin/proxy${path}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong.')
  return data
}

export default function AuditLogClient() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/admin/action-logs')
      .then((data) => setLogs(data.logs))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const columns = useMemo(
    () => [
      {
        id: 'action',
        header: 'Action',
        accessorFn: (row) => row.action,
        cell: ({ row }) => (
          <Badge variant={ACTION_VARIANT[row.original.action] || 'secondary'} className="capitalize">
            {row.original.action.replace('ngo.', '').replace('_', ' ')}
          </Badge>
        ),
      },
      {
        id: 'actor',
        header: 'Admin',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.actor.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.actor.handle}</p>
          </div>
        ),
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.targetId.slice(0, 8)}…</span>,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => <span className="text-sm text-muted-foreground max-w-xs truncate block">{row.original.reason || '–'}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'When',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>,
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">NGOs</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Audit log</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every approve, reject, suspend, and reinstate action, in order.</p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyState={<EmptyState icon={ScrollText} title="No actions yet" body="Approve/reject/suspend actions on NGOs will show up here." />}
      />
    </DashboardPageShell>
  )
}

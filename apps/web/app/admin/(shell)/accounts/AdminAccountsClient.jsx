'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Users, ShieldBan, ShieldCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'user', label: 'Users' },
  { value: 'ngo', label: 'NGOs' },
  { value: 'nursery', label: 'Nurseries' },
  { value: 'corporate', label: 'Corporates' },
]

const APPROVAL_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }

function orgNameFor(account) {
  return account.ngoProfile?.orgName ?? account.nurseryProfile?.nurseryName ?? account.corporateProfile?.companyName ?? null
}

function approvalStatusFor(account) {
  return account.ngoProfile?.status ?? account.nurseryProfile?.status ?? account.corporateProfile?.status ?? null
}

function RowActions({ account, onAction, onViewProfile }) {
  const [confirm, setConfirm] = useState(null) // 'block' | 'unblock'
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const runAction = async () => {
    if (!confirm) return
    setWorking(true)
    try {
      await onAction(account.id, confirm, reason)
      toast.success(confirm === 'block' ? 'Account blocked.' : 'Account unblocked.')
      setConfirm(null)
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {account.isBlocked ? (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('unblock')}>
          <ShieldCheck className="h-3.5 w-3.5" /> Unblock
        </Button>
      ) : (
        <Button size="sm" variant="destructive" className="rounded-full h-8" onClick={() => setConfirm('block')}>
          <ShieldBan className="h-3.5 w-3.5" /> Block
        </Button>
      )}
      <Button size="sm" variant="ghost" className="rounded-full h-8" onClick={() => onViewProfile(account)}>
        <ExternalLink className="h-3.5 w-3.5" /> Profile
      </Button>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'block' ? 'Block this account?' : 'Unblock this account?'}
        description={
          confirm === 'block'
            ? 'They immediately lose access on web and mobile — every signed-in request will be rejected until unblocked.'
            : 'They regain full access on web and mobile immediately.'
        }
        confirmLabel={confirm === 'block' ? 'Block' : 'Unblock'}
        destructive={confirm === 'block'}
        loading={working}
        onConfirm={runAction}
      >
        {confirm === 'block' && (
          <label className="block">
            <span className="eyebrow">Reason (kept on file, not shown to the account)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default function AdminAccountsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [type, setType] = useState(() => {
    const initial = searchParams.get('type') ?? ''
    return TYPE_FILTERS.some((f) => f.value === initial) ? initial : ''
  })
  const [blockedOnly, setBlockedOnly] = useState(() => searchParams.get('blocked') === '1')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQ) params.set('q', debouncedQ)
      if (type) params.set('type', type)
      if (blockedOnly) params.set('isBlocked', '1')
      const data = await proxy(`/admin/accounts?${params.toString()}`)
      setAccounts(data.accounts)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [debouncedQ, type, blockedOnly])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = useCallback(
    async (userId, action, reason) => {
      await proxy(`/admin/accounts/${userId}/${action}`, { method: 'POST', body: action === 'block' ? { reason: reason || undefined } : undefined })
      await load()
    },
    [load],
  )

  const goToProfile = useCallback((account) => router.push(`/admin/accounts/${account.id}`), [router])

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Account',
        cell: ({ row }) => {
          const orgName = orgNameFor(row.original)
          return (
            <div>
              <p className="font-medium">{orgName || row.original.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{row.original.handle} · {row.original.email}</p>
            </div>
          )
        },
      },
      {
        accessorKey: 'role',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.role}</Badge>,
      },
      {
        id: 'approvalStatus',
        header: 'Approval',
        cell: ({ row }) => {
          const status = approvalStatusFor(row.original)
          if (!status) return <span className="text-xs text-muted-foreground">—</span>
          return <Badge variant={APPROVAL_VARIANT[status]} className="capitalize">{status}</Badge>
        },
      },
      {
        accessorKey: 'isBlocked',
        header: 'Status',
        cell: ({ row }) => (
          <div>
            {row.original.isBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="secondary">Active</Badge>}
            {row.original.isBlocked && row.original.blockedReason && (
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px] truncate" title={row.original.blockedReason}>
                &ldquo;{row.original.blockedReason}&rdquo;
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <RowActions account={row.original} onAction={handleAction} onViewProfile={goToProfile} />,
      },
    ],
    [handleAction, goToProfile],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Trust &amp; safety</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Search any user, NGO, nursery, or corporate account and block or unblock its access.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, handle, email, org…"
            className="pl-9 rounded-full h-10"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 border-b border-border/70 sm:border-0">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setType(f.value)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px transition sm:rounded-full sm:border-0 sm:px-3 sm:py-1.5 ${
                  type === f.value ? 'border-primary text-foreground sm:bg-primary sm:text-primary-foreground' : 'border-transparent text-muted-foreground hover:text-foreground sm:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBlockedOnly((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              blockedOnly ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Blocked only
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={accounts}
        loading={loading}
        emptyState={<EmptyState icon={Users} title="No matching accounts" body="Try a different search or filter." />}
      />
    </DashboardPageShell>
  )
}

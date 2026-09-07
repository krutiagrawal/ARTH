'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Flag, ShieldBan, EyeOff, Eye, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '@/lib/adminProxyClient'

// 'accounts' is a shorthand the backend expands to targetType in (user, ngo,
// nursery, corporate) — this is the queue's default tab, since account
// reports are what admin needs to see first/on priority.
const TABS = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'post', label: 'Posts' },
  { value: 'story', label: 'Stories' },
]

const STATUS_FILTERS = ['open', 'actioned', 'dismissed']

function ReportRow({ report, onAction }) {
  const [confirm, setConfirm] = useState(null) // 'block_account' | 'hide' | 'unhide' | 'delete' | 'dismiss'
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const runAction = async (action) => {
    setWorking(true)
    try {
      await onAction(report.id, action, reason)
      toast.success('Report updated.')
      setConfirm(null)
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  const isAccountReport = Boolean(report.account)

  return (
    <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {isAccountReport ? (
            <>
              <p className="font-medium">{report.account.name} <span className="text-muted-foreground font-normal">@{report.account.handle}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{report.account.role} account{report.account.isBlocked ? ' · already blocked' : ''}</p>
            </>
          ) : report.post ? (
            <>
              <p className="font-medium">{report.post.authorName || 'Unknown author'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate">{report.post.caption || '(no caption)'}{report.post.isHidden ? ' · hidden' : ''}</p>
            </>
          ) : (
            <p className="font-medium capitalize">{report.targetType} report</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Reported by {report.reporter?.name || 'someone'} for <span className="capitalize">{report.reason}</span>
            {report.details ? ` — "${report.details}"` : ''}
          </p>
        </div>
        <Badge variant={report.status === 'open' ? 'outline' : report.status === 'dismissed' ? 'secondary' : 'default'} className="capitalize">
          {report.status}
        </Badge>
      </div>

      {report.status === 'open' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isAccountReport && !report.account.isBlocked && (
            <Button variant="destructive" size="sm" className="rounded-full" onClick={() => setConfirm('block_account')}>
              <ShieldBan className="h-4 w-4" /> Block account
            </Button>
          )}
          {report.post && !report.post.isHidden && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => runAction('hide')} disabled={working}>
              <EyeOff className="h-4 w-4" /> Hide
            </Button>
          )}
          {report.post && report.post.isHidden && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => runAction('unhide')} disabled={working}>
              <Eye className="h-4 w-4" /> Unhide
            </Button>
          )}
          {(report.post || report.targetType === 'story') && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setConfirm('delete')}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => runAction('dismiss')} disabled={working}>
            <Check className="h-4 w-4" /> Dismiss
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === 'block_account' ? 'Block this account?' : 'Delete this content?'}
        description={
          confirm === 'block_account'
            ? 'They immediately lose access on web and mobile.'
            : 'This removes the content permanently.'
        }
        confirmLabel={confirm === 'block_account' ? 'Block' : 'Delete'}
        destructive
        loading={working}
        onConfirm={() => runAction(confirm)}
      >
        <label className="block">
          <span className="eyebrow">Reason (optional)</span>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
        </label>
      </ConfirmDialog>
    </div>
  )
}

export default function AdminReportsClient() {
  const [tab, setTab] = useState('accounts')
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState([])
  const [accountOpenCount, setAccountOpenCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ targetType: tab, status })
      const data = await proxy(`/admin/reports?${params.toString()}`)
      setReports(data.reports)
      setAccountOpenCount(data.accountOpenCount ?? 0)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [tab, status])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id, action, reason) => {
    await proxy(`/admin/reports/${id}`, { method: 'PATCH', body: { action, reason: reason || undefined } })
    await load()
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Trust &amp; safety</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {accountOpenCount > 0 ? `${accountOpenCount} open account report${accountOpenCount === 1 ? '' : 's'} need review.` : 'No open account reports right now.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 border-b border-border/70">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
                tab === t.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${
                status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title={`No ${status} reports`} body="Nothing to review here right now." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onAction={handleAction} />
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

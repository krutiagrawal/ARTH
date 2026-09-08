'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Ban, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'

const TABS = [
  { value: 'drives', label: 'Drives', endpoint: '/admin/drives', listKey: 'drives' },
  { value: 'donations', label: 'Donations', endpoint: '/admin/donations', listKey: 'donations' },
  { value: 'orders', label: 'Orders', endpoint: '/admin/orders', listKey: 'orders' },
]

function money(cents, currency = 'inr') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency.toUpperCase() }).format((cents ?? 0) / 100)
}

function ActionButton({ tab, item, onAction }) {
  const [confirm, setConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const disabled = tab === 'drives' ? item.status === 'cancelled' : tab === 'orders' ? item.status === 'cancelled' : item.status !== 'succeeded'
  if (disabled) return null

  const label = tab === 'drives' ? 'Cancel' : 'Refund'

  const run = async () => {
    setWorking(true)
    try {
      await onAction(item.id, reason)
      toast.success(`${label} applied.`)
      setConfirm(false)
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" className="rounded-full" onClick={() => setConfirm(true)}>
        <Ban className="h-4 w-4" /> {label}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={tab === 'drives' ? 'Cancel this drive?' : 'Refund this transaction?'}
        description={tab === 'drives' ? 'RSVPs stay on record but the drive is marked cancelled.' : 'This issues a real Stripe refund and cannot be undone.'}
        confirmLabel={label}
        destructive
        loading={working}
        onConfirm={run}
      >
        <label className="block">
          <span className="eyebrow">Reason (optional)</span>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
        </label>
      </ConfirmDialog>
    </>
  )
}

function Row({ tab, item, onAction }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        {tab === 'drives' && (
          <>
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.ngo?.orgName} · {item._count?.rsvps ?? 0} RSVPs</p>
          </>
        )}
        {tab === 'donations' && (
          <>
            <p className="font-medium">{money(item.amountCents, item.currency)} to {item.campaign?.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.campaign?.ngo?.orgName} · from {item.user?.name}</p>
          </>
        )}
        {tab === 'orders' && (
          <>
            <p className="font-medium">{money(item.totalCents, item.currency)} · {item.nursery?.nurseryName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ordered by {item.user?.name}</p>
          </>
        )}
        <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt ?? item.startsAt).toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="capitalize">{item.status}</Badge>
        <ActionButton tab={tab} item={item} onAction={onAction} />
      </div>
    </div>
  )
}

export default function AdminOpsClient() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState(TABS.some((t) => t.value === initialTab) ? initialTab : 'drives')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const activeTab = TABS.find((t) => t.value === tab)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(activeTab.endpoint)
      setItems(data[activeTab.listKey])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id, reason) => {
    const path =
      tab === 'drives' ? `/admin/drives/${id}/cancel` : tab === 'donations' ? `/admin/donations/${id}/refund` : `/admin/orders/${id}/refund`
    await proxy(path, { method: 'PATCH', body: { reason: reason || undefined } })
    await load()
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Operations</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Drives, donations &amp; orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Step in on disputes — cancel a drive or refund a transaction.</p>
      </div>

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

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={PackageSearch} title={`No ${tab}`} body="Nothing here yet." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Row key={item.id} tab={tab} item={item} onAction={handleAction} />
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

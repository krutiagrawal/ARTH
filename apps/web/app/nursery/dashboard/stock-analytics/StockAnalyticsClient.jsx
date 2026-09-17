'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Gift, Sprout, Handshake, Boxes, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import StatTile from '@/components/dashboard/StatTile'
import { proxy } from '../proxy'

const REASON_LABEL = {
  manual_add: 'Added stock',
  manual_adjust: 'Adjusted stock',
  manual_remove: 'Removed stock',
  reservation_fulfilled: 'Given to a planter',
}

const REASON_ICON = {
  manual_add: ArrowUp,
  manual_adjust: RefreshCw,
  manual_remove: ArrowDown,
  reservation_fulfilled: Gift,
}

function LedgerRow({ item }) {
  const Icon = REASON_ICON[item.reason] || Boxes
  const positive = item.delta > 0
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">
          <span className="font-medium">{item.species}</span> – {REASON_LABEL[item.reason] || item.reason}
        </p>
        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
      <span className={`text-sm font-semibold shrink-0 ${positive ? 'text-primary' : 'text-destructive'}`}>
        {positive ? '+' : ''}
        {item.delta}
      </span>
    </div>
  )
}

export default function StockAnalyticsClient() {
  const [analytics, setAnalytics] = useState(null)
  const [ledger, setLedger] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(true)

  useEffect(() => {
    proxy('/nursery/stock/analytics')
      .then(setAnalytics)
      .catch((err) => toast.error(err.message || 'Could not load stock analytics.'))
      .finally(() => setStatsLoading(false))
    proxy('/nursery/stock/ledger')
      .then(setLedger)
      .catch((err) => toast.error(err.message || 'Could not load stock activity.'))
      .finally(() => setLedgerLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-8">
      <div>
        <p className="eyebrow text-primary">Stock Analytics</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">How your inventory has grown</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile label="Given out (lifetime)" value={analytics?.totalGivenOutLifetime ?? 0} icon={Gift} tone="primary" loading={statsLoading} />
        <StatTile label="Added (lifetime)" value={analytics?.totalAddedLifetime ?? 0} icon={Sprout} tone="sand" loading={statsLoading} />
        <StatTile label="Requests fulfilled" value={analytics?.reservationsFulfilled ?? 0} icon={Handshake} tone="primary" loading={statsLoading} />
        <StatTile label="Currently in stock" value={analytics?.currentTotalQuantity ?? 0} icon={Boxes} tone="sand" loading={statsLoading} />
      </div>

      <div>
        <h2 className="eyebrow mb-3">Recent activity</h2>
        {ledgerLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : ledger.length === 0 ? (
          <EmptyState className="p-6" icon={Boxes} title="No activity yet" body="Stock changes will show up here." />
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
            {ledger.map((item) => (
              <LedgerRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

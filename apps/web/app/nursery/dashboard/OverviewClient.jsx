'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Boxes,
  PackageSearch,
  Truck,
  Sprout,
  TreePine,
  IndianRupee,
  ClipboardList,
  AlertTriangle,
  Quote,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import StatTile from '@/components/dashboard/StatTile'
import EmptyState from '@/components/dashboard/EmptyState'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import CitySelect from '@/components/dashboard/CitySelect'
import { proxy } from './proxy'
import { useNurseryProfile } from './NurseryProfileContext'

function StatusBanner({ profile, onResubmitted }) {
  if (profile.status === 'pending') {
    return (
      <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
        <p className="font-serif text-xl">Your application is with our team.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for your patience, {profile.nurseryName} – we&rsquo;re reviewing your details carefully.
          We&rsquo;ll email you the moment there&rsquo;s a decision. You can still see everything below, you just
          can&rsquo;t take orders or respond to bulk requirements until you&rsquo;re approved.
        </p>
      </div>
    )
  }

  if (profile.status === 'suspended') {
    return (
      <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 soft-shadow">
        <p className="font-serif text-xl">Your account has been suspended.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {profile.rejectionReason
            ? `Our team noted: "${profile.rejectionReason}"`
            : 'Publishing is paused for this account.'}{' '}
          Your existing inventory and orders are still visible below, but you can&rsquo;t create or edit anything
          while suspended. Contact the ARTH team if you have questions.
        </p>
      </div>
    )
  }

  if (profile.status === 'rejected') {
    return <RejectedPanel profile={profile} onResubmitted={onResubmitted} />
  }

  return null
}

function RejectedPanel({ profile, onResubmitted }) {
  const [form, setForm] = useState({
    nurseryName: profile.nurseryName || '',
    description: profile.description || '',
    city: profile.city || 'Pune',
    contactPhone: profile.contactPhone || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const resubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await proxy('/nursery/profile', { method: 'PATCH', body: form })
      const updated = await proxy('/nursery/resubmit', { method: 'POST' })
      onResubmitted(updated)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
      <p className="font-serif text-xl">This one didn&rsquo;t go through – but it&rsquo;s not the end.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {profile.rejectionReason
          ? `Our team noted: "${profile.rejectionReason}"`
          : "Our team wasn't able to approve this application this time."}{' '}
        Update your details below whenever you&rsquo;re ready, and send it our way again.
      </p>

      <form onSubmit={resubmit} className="mt-6 space-y-3 max-w-lg">
        <label className="block">
          <span className="eyebrow">Nursery name</span>
          <Input required value={form.nurseryName} onChange={set('nurseryName')} className="mt-2 h-11 rounded-full" />
        </label>
        <label className="block">
          <span className="eyebrow">About your nursery</span>
          <Textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">City</span>
            <CitySelect value={form.city} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
          </label>
          <label className="block">
            <span className="eyebrow">Phone (optional)</span>
            <Input value={form.contactPhone} onChange={set('contactPhone')} className="mt-2 h-11 rounded-full" />
          </label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting} type="submit" className="rounded-full h-11">
          {submitting ? 'Resubmitting…' : 'Resubmit for review'}
        </Button>
      </form>
    </div>
  )
}

const ACTIVITY_ICON = {
  order_placed: PackageSearch,
  order_picked_up: Truck,
  order_delivered: Truck,
  sapling_planted: Sprout,
  stock_low: AlertTriangle,
  stock_out_of_stock: AlertTriangle,
  bulk_requirement_nearby: ClipboardList,
  nursery_tree_milestone: TreePine,
  nursery_impact_milestone: Leaf,
}

const ACTIVITY_LABEL = {
  order_placed: 'New order placed',
  order_picked_up: 'Order picked up',
  order_delivered: 'Order delivered',
  sapling_planted: 'A sapling you supplied was planted',
  stock_low: 'Stock running low',
  stock_out_of_stock: 'Item went out of stock',
  bulk_requirement_nearby: 'New bulk requirement nearby',
  nursery_tree_milestone: 'Tree milestone reached',
  nursery_impact_milestone: 'Impact milestone reached',
}

function ActivityRow({ item }) {
  const Icon = ACTIVITY_ICON[item.type] || Sprout
  const label = ACTIVITY_LABEL[item.type] || item.type
  const detail = [item.data?.species, item.data?.quantity, item.data?.ngoName, item.data?.orderNumber]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">
          <span className="font-medium">{label}</span>
          {detail ? ` – ${detail}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
    </div>
  )
}

function OverviewHero({ nurseryName }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
      <div>
        <p className="eyebrow text-primary">Overview</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2 flex items-center gap-2">
          Welcome back, {nurseryName}.
          <Sprout className="h-6 w-6 text-primary" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Here&rsquo;s what needs your attention today.</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 soft-shadow max-w-[240px] shrink-0">
        <p className="text-xs font-serif italic leading-snug text-foreground/90">
          <Quote className="inline h-3 w-3 text-primary/60 -mt-0.5 mr-1" />
          Every sapling you raise becomes someone else&rsquo;s tree.
        </p>
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Manage inventory', description: 'Update stock and prices', href: '/nursery/dashboard/inventory', icon: Boxes, tone: 'primary' },
  { label: 'View orders', description: 'Pack and dispatch orders', href: '/nursery/dashboard/orders', icon: PackageSearch, tone: 'sand' },
  { label: 'Pickup & delivery', description: 'Configure how customers get saplings', href: '/nursery/dashboard/pickup-delivery', icon: Truck, tone: 'primary' },
]

const TONE_BADGE = {
  primary: 'bg-primary/15 text-primary',
  sand: 'bg-sand/25 text-accent',
}

function QuickActionChip({ action }) {
  return (
    <Link
      href={action.href}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card py-1.5 pl-1.5 pr-4 soft-shadow hover:bg-secondary/50 transition-colors"
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${TONE_BADGE[action.tone]}`}>
        <action.icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-medium">{action.label}</span>
    </Link>
  )
}

export default function OverviewClient() {
  const { profile, loading: profileLoading, setProfile } = useNurseryProfile()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    proxy('/nursery/dashboard/today')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [])

  if (profileLoading || !profile) {
    return (
      <DashboardPageShell className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatTile key={i} loading />
          ))}
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="space-y-6">
      <OverviewHero nurseryName={profile.nurseryName} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow text-muted-foreground shrink-0">Quick actions</span>
        {QUICK_ACTIONS.map((action) => (
          <QuickActionChip key={action.href} action={action} />
        ))}
      </div>

      {profile.status !== 'approved' && <StatusBanner profile={profile} onResubmitted={setProfile} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile label="Orders today" value={stats?.ordersToday ?? 0} description="Placed today" icon={PackageSearch} tone="primary" href="/nursery/dashboard/orders" loading={statsLoading} />
        <StatTile label="New pending" value={stats?.newPending ?? 0} description="Awaiting confirmation" icon={ClipboardList} tone="sand" href="/nursery/dashboard/orders" loading={statsLoading} />
        <StatTile label="Ready for pickup" value={stats?.readyForPickup ?? 0} description="Waiting for handoff" icon={Boxes} tone="primary" href="/nursery/dashboard/orders" loading={statsLoading} />
        <StatTile label="Deliveries pending" value={stats?.deliveriesPending ?? 0} description="Out or awaiting dispatch" icon={Truck} tone="sand" href="/nursery/dashboard/orders" loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-3 rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
          <p className="font-serif text-lg">Impact so far</p>
          {statsLoading ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Sprout className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Supplied</span>
                </div>
                <p className="font-serif text-2xl mt-2">{stats?.saplingsSuppliedLifetime ?? 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <TreePine className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Verified planted</span>
                </div>
                <p className="font-serif text-2xl mt-2">{stats?.verifiedPlantations ?? 0}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Revenue via ARTH</span>
                </div>
                <p className="font-serif text-2xl mt-2">₹{((stats?.revenueViaArthCents ?? 0) / 100).toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
          <Link href="/nursery/dashboard/impact" className="mt-4 inline-flex text-xs font-medium text-primary">
            View full impact →
          </Link>
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <p className="font-serif text-lg">Low stock</p>
            </div>
            <Link href="/nursery/dashboard/inventory" className="text-xs text-primary font-medium">
              View all
            </Link>
          </div>
          <div className="mt-3 flex-1">
            {statsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !stats?.lowStockSpecies?.length ? (
              <p className="text-sm text-muted-foreground">Everything&rsquo;s well stocked right now.</p>
            ) : (
              <div className="space-y-2">
                {stats.lowStockSpecies.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.species}</span>
                    <Badge variant={s.availabilityStatus === 'out_of_stock' ? 'destructive' : 'secondary'} className="capitalize">
                      {s.availabilityStatus === 'out_of_stock' ? 'Out of stock' : `${s.quantity} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="eyebrow">Bulk requirements nearby</h2>
          <Link href="/nursery/dashboard/requirements" className="text-xs text-primary font-medium">
            View all
          </Link>
        </div>
        {statsLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !stats?.upcomingBulkRequirements?.length ? (
          <EmptyState className="p-6" icon={ClipboardList} title="Nothing nearby right now" body="NGO bulk requirements near you will show up here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.upcomingBulkRequirements.map((r) => (
              <Link
                key={r.id}
                href="/nursery/dashboard/requirements"
                className="rounded-2xl border border-border/70 bg-card p-4 soft-shadow hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-medium">{r.ngoName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.species || 'Any species'} · {r.quantityFulfilled}/{r.quantityNeeded} fulfilled
                  {r.city ? ` · ${r.city}` : ''}
                </p>
                {r.neededByDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">Needed by {new Date(r.neededByDate).toLocaleDateString()}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="eyebrow mb-3">Recent activity</h2>
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !stats?.activity?.length ? (
          <EmptyState className="p-6" icon={Sprout} title="No activity yet" body="Orders, stock alerts, and milestones will show up here." />
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
            {stats.activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

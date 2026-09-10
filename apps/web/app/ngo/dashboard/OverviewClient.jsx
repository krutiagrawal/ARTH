'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarDays,
  Heart,
  IndianRupee,
  TreePine,
  Users,
  Sprout,
  MapPin,
  Cloud,
  Leaf,
  Quote,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import StatTile from '@/components/dashboard/StatTile'
import EmptyState from '@/components/dashboard/EmptyState'
import ImpactPanel from '@/components/dashboard/ImpactPanel'
import ScheduleCalendar from '@/components/dashboard/ScheduleCalendar'
import ScheduleTimeline from '@/components/dashboard/ScheduleTimeline'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from './proxy'
import { useNgoProfile } from './NgoProfileContext'

function StatusBanner({ profile, onResubmitted }) {
  if (profile.status === 'pending') {
    return (
      <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
        <p className="font-serif text-xl">Your application is with our team.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for your patience, {profile.orgName} – we&rsquo;re reviewing your details carefully. We&rsquo;ll
          email you the moment there&rsquo;s a decision. You can still see everything below, you just can&rsquo;t
          publish new drives, trees, or campaigns until you&rsquo;re approved.
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
          Your existing drives, trees, and campaigns are still visible below, but you can&rsquo;t create or edit
          anything while suspended. Contact the ARTH team if you have questions.
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
    orgName: profile.orgName || '',
    description: profile.description || '',
    website: profile.website || '',
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
      await proxy('/ngo/profile', { method: 'PATCH', body: { ...form, website: form.website || undefined } })
      const updated = await proxy('/ngo/resubmit', { method: 'POST' })
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
        Update your details below whenever you&rsquo;re ready, and send it our way again. Your existing drives,
        trees, and campaigns stay visible below in the meantime.
      </p>

      <form onSubmit={resubmit} className="mt-6 space-y-3 max-w-lg">
        <label className="block">
          <span className="eyebrow">Organization name</span>
          <Input required value={form.orgName} onChange={set('orgName')} className="mt-2 h-11 rounded-full" />
        </label>
        <label className="block">
          <span className="eyebrow">About your organization</span>
          <Textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">Website (optional)</span>
            <Input value={form.website} onChange={set('website')} placeholder="https://" className="mt-2 h-11 rounded-full" />
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

function ActivityRow({ item }) {
  const label =
    item.type === 'rsvp'
      ? `RSVP'd to ${item.detail}`
      : item.type === 'donation'
        ? `Donated ₹${(item.amountCents / 100).toLocaleString()} to ${item.detail}`
        : `Adopted ${item.detail}`

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        {item.type === 'rsvp' ? <CalendarDays className="h-4 w-4" /> : item.type === 'donation' ? <Heart className="h-4 w-4" /> : <TreePine className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">
          <span className="font-medium">{item.actor.name}</span> ({item.actor.handle}) {label}
        </p>
        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
    </div>
  )
}

function OverviewHero({ orgName }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
      <div>
        <p className="eyebrow text-primary">Overview</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2 flex items-center gap-2">
          Welcome back, {orgName}.
          <Leaf className="h-6 w-6 text-primary" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Here&rsquo;s what&rsquo;s happening with your impact today.</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative h-16 w-16 shrink-0 hidden sm:block" aria-hidden="true">
          <div className="absolute inset-0 rounded-[40%_60%_60%_40%/50%_40%_60%_50%] bg-primary/30 blur-[1px]" />
          <div className="absolute -inset-0.5 rounded-[55%_45%_45%_55%/55%_55%_45%_45%] bg-sand/40" />
          <div className="absolute inset-1 overflow-hidden rounded-[45%_55%_55%_45%/55%_45%_55%_45%]">
            <Image
              src="/assets/ngo-dashboard/hero-hands-soil.jpg"
              alt=""
              fill
              sizes="64px"
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 soft-shadow max-w-[220px]">
          <p className="text-xs font-serif italic leading-snug text-foreground/90">
            <Quote className="inline h-3 w-3 text-primary/60 -mt-0.5 mr-1" />
            Every tree we nurture today, builds a better tomorrow.
          </p>
        </div>
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Manage drives', description: 'View and manage your drives', href: '/ngo/dashboard/drives', icon: CalendarDays, tone: 'primary' },
  { label: 'Manage campaigns', description: 'Create and manage campaigns', href: '/ngo/dashboard/campaigns', icon: Heart, tone: 'sand' },
  { label: 'Add adoptable tree', description: 'List a tree for adoption', href: '/ngo/dashboard/trees', icon: TreePine, tone: 'primary' },
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

// Buckets `stats.activity` into 6 weekly counts so stat tiles get a
// lightweight trend sparkline — the reference's sparklines are decorative
// flourishes, not literal historical series, and no time-series endpoint
// exists yet, so this derives one from data already on the page.
function weeklySparkline(activity) {
  if (!activity?.length) return undefined
  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000
  const buckets = Array.from({ length: 6 }, () => 0)
  for (const item of activity) {
    const age = now - new Date(item.createdAt).getTime()
    const idx = 5 - Math.min(5, Math.floor(age / week))
    if (idx >= 0) buckets[idx] += 1
  }
  return buckets.map((value) => ({ value }))
}

export default function OverviewClient() {
  const { profile, loading: profileLoading, setProfile } = useNgoProfile()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [drives, setDrives] = useState([])

  useEffect(() => {
    proxy('/ngo/stats')
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))

    proxy('/drives/mine')
      .then((data) => setDrives(data.filter((d) => d.status === 'upcoming')))
      .catch(() => setDrives([]))
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

  const upcomingSorted = [...drives].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  const eventDates = upcomingSorted.map((d) => new Date(d.startsAt))
  const timelineEvents = upcomingSorted.slice(0, 5).map((d, i) => ({
    time: new Date(d.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    title: d.title,
    subtitle: 'Plantation Drive',
    icon: CalendarDays,
    color: i % 2 === 0 ? 'primary' : 'sand',
  }))

  return (
    <DashboardPageShell className="space-y-6">
      <OverviewHero orgName={profile.orgName} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="eyebrow text-muted-foreground shrink-0">Quick actions</span>
        {QUICK_ACTIONS.map((action) => (
          <QuickActionChip key={action.href} action={action} />
        ))}
      </div>

      {profile.status !== 'approved' && <StatusBanner profile={profile} onResubmitted={setProfile} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile
          label="Active campaigns"
          value={stats?.activeCampaigns ?? 0}
          description="Live campaigns running"
          icon={Sprout}
          tone="primary"
          href="/ngo/dashboard/campaigns"
          sparklineData={weeklySparkline(stats?.activity)}
          loading={statsLoading}
        />
        <StatTile
          label="Total raised"
          value={`₹${((stats?.totalRaisedCents ?? 0) / 100).toLocaleString()}`}
          description="Across all campaigns"
          icon={IndianRupee}
          tone="sand"
          href="/ngo/dashboard/campaigns"
          sparklineData={weeklySparkline(stats?.activity)}
          loading={statsLoading}
        />
        <StatTile
          label="Upcoming drives"
          value={stats?.upcomingDrives ?? 0}
          description="Scheduled drives"
          icon={CalendarDays}
          tone="primary"
          href="/ngo/dashboard/drives"
          sparklineData={weeklySparkline(stats?.activity)}
          loading={statsLoading}
        />
        <StatTile
          label="Total RSVPs"
          value={stats?.totalRsvps ?? 0}
          description="People engaged"
          icon={Users}
          tone="sand"
          sparklineData={weeklySparkline(stats?.activity)}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-3">
          {statsLoading ? (
            <Skeleton className="h-full min-h-[280px] w-full rounded-3xl" />
          ) : (
            <ImpactPanel
              title="Impact snapshot"
              subtitle="Your collective efforts create real change."
              metrics={[
                { icon: TreePine, value: stats?.treesAvailable ?? 0, label: 'Trees available for adoption' },
                { icon: Sprout, value: stats?.treesAdopted ?? 0, label: 'Trees adopted' },
                { icon: MapPin, value: stats?.communitiesReached ?? 0, label: 'Communities reached' },
                { icon: Cloud, value: `${stats?.co2AbsorptionKg ?? 0} kg`, label: 'CO2 absorption potential' },
                { icon: Heart, value: stats?.volunteersInvolved ?? 0, label: 'Volunteers involved' },
                { icon: IndianRupee, value: `₹${((stats?.totalRaisedCents ?? 0) / 100).toLocaleString()}`, label: 'Donations received' },
              ]}
              image="/assets/ngo-dashboard/impact-sprout.jpg"
              ctaHref="/ngo/dashboard/reports"
              ctaLabel="View full reports"
            />
          )}
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex flex-col h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="font-serif text-lg">Upcoming schedule</p>
            </div>
            <Link href="/ngo/dashboard/drives" className="text-xs text-primary font-medium">
              View all
            </Link>
          </div>

          <div className="mt-4 flex-1 grid grid-cols-1 sm:grid-cols-5 gap-5 items-center">
            <div className="sm:col-span-3">
              <ScheduleCalendar eventDates={eventDates} />
            </div>
            <div className="sm:col-span-2">
              <ScheduleTimeline events={timelineEvents} />
            </div>
          </div>

          <Link
            href="/ngo/dashboard/drives"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus className="h-3 w-3" /> Add new drive
          </Link>
        </div>
      </div>

      <div>
        <h2 className="eyebrow mb-3">Recent activity</h2>
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !stats?.activity?.length ? (
          <EmptyState
            className="p-6"
            icon={Sprout}
            title="No activity yet"
            body="RSVPs, adoptions, and donations for your drives, trees, and campaigns will show up here."
          />
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
            {stats.activity.map((item, i) => (
              <ActivityRow key={i} item={item} />
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

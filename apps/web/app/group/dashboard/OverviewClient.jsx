'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TreePine, Zap, Leaf, Users, Copy, Check } from 'lucide-react'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import StatTile from '@/components/dashboard/StatTile'
import { useGroupProfile } from './GroupProfileContext'
import { proxy } from './proxy'

function InviteCodeCard({ profile }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the code is
      // still shown on screen, so this is a nice-to-have, not a hard requirement.
    }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="eyebrow text-primary">Invite code</p>
        <p className="font-serif text-3xl tracking-[0.3em] mt-1">{profile.inviteCode}</p>
        <p className="text-sm text-muted-foreground mt-1">Share this so members can join from their own account.</p>
      </div>
      <button onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </div>
  )
}

export default function OverviewClient() {
  const { profile, loading: profileLoading } = useGroupProfile()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    proxy('/group/stats').then(setStats).catch(() => setStats(null)).finally(() => setStatsLoading(false))
  }, [])

  if (profileLoading || !profile) {
    return (
      <DashboardPageShell className="space-y-6">
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map((i) => <StatTile key={i} loading />)}
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Group Dashboard</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Welcome back, {profile.groupName}.</h1>
      </div>

      <InviteCodeCard profile={profile} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile label="Members" value={stats?.memberCount ?? 0} icon={Users} tone="primary" href="/group/dashboard/members" loading={statsLoading} />
        <StatTile label="Trees planted" value={stats?.treesPlantedTotal ?? 0} icon={TreePine} tone="sand" loading={statsLoading} />
        <StatTile label="XP earned" value={stats?.xpTotal ?? 0} icon={Zap} tone="primary" loading={statsLoading} />
        <StatTile label="CO₂ absorbed (kg)" value={stats ? Math.round(stats.co2AbsorbedTotal) : 0} icon={Leaf} tone="sand" loading={statsLoading} />
      </div>

      <div className="rounded-2xl border border-border/70 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-serif text-lg">Ready to challenge your group?</p>
          <p className="text-sm text-muted-foreground mt-1">Set a shared goal and watch members plant toward it together.</p>
        </div>
        <Link href="/group/dashboard/challenges" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
          New challenge
        </Link>
      </div>
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, ShieldCheck, CalendarDays, Sprout, IndianRupee, FileStack, Mail, LogIn, Users2, ShieldBan, Flag, TreePine, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StatTile from '@/components/dashboard/StatTile'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'

function SignInPrompt({ label, href }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 p-8 text-center">
      <p className="font-serif text-lg">{label}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to that admin to see these numbers.</p>
      <Button asChild variant="outline" className="mt-4 rounded-full">
        <Link href={href}>
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      </Button>
    </div>
  )
}

export default function OverviewClient() {
  const [platform, setPlatform] = useState({ loading: true, signedIn: true, data: null })
  const [content, setContent] = useState({ loading: true, signedIn: true, data: null })

  useEffect(() => {
    fetch('/api/admin/proxy/admin/overview')
      .then(async (res) => {
        if (!res.ok) return setPlatform({ loading: false, signedIn: false, data: null })
        setPlatform({ loading: false, signedIn: true, data: await res.json() })
      })
      .catch(() => setPlatform({ loading: false, signedIn: false, data: null }))

    fetch('/api/admin/content-overview')
      .then(async (res) => {
        if (!res.ok) return setContent({ loading: false, signedIn: false, data: null })
        setContent({ loading: false, signedIn: true, data: await res.json() })
      })
      .catch(() => setContent({ loading: false, signedIn: false, data: null }))
  }, [])

  return (
    <DashboardPageShell className="space-y-10">
      <div>
        <p className="eyebrow text-primary">Admin</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Overview</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          One admin account covers everything below — NGO approvals and platform stats, plus the ARTH site&rsquo;s
          own content (blog, competitions, newsletter).
        </p>
      </div>

      <section>
        <h2 className="eyebrow mb-4">Platform — NGOs, drives, donations</h2>
        {platform.loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatTile key={i} loading />
            ))}
          </div>
        ) : !platform.signedIn ? (
          <SignInPrompt label="Platform stats are hidden" href="/admin/login" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-5">
            <StatTile
              label="Total users"
              value={Object.values(platform.data.usersByRole).reduce((a, b) => a + b, 0)}
              description="Across all roles"
              icon={Users}
              tone="primary"
            />
            <StatTile
              label="NGOs"
              value={`${platform.data.ngosByStatus.approved ?? 0} approved`}
              description="Currently publishing"
              icon={ShieldCheck}
              tone="sand"
              href="/admin/ngos"
            />
            <StatTile label="Groups" value={platform.data.groupsCount ?? 0} description="All-time" icon={Users2} tone="primary" href="/admin/groups" />
            <StatTile label="Drives" value={platform.data.drivesCount} description="Created all-time" icon={CalendarDays} tone="primary" />
            <StatTile label="Trees adopted" value={platform.data.adoptedTreesCount} description="Across all NGOs" icon={Sprout} tone="sand" />
            <StatTile
              label="Total donated"
              value={`₹${(platform.data.totalDonatedCents / 100).toLocaleString()}`}
              description="Succeeded donations"
              icon={IndianRupee}
              tone="primary"
            />
          </div>
        )}
        {platform.signedIn && platform.data && (
          <p className="mt-3 text-xs text-muted-foreground">
            NGOs by status: {Object.entries(platform.data.ngosByStatus).map(([k, v]) => `${v} ${k}`).join(' · ') || 'none yet'}
          </p>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4">Trust &amp; safety</h2>
        {platform.loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatTile key={i} loading />
            ))}
          </div>
        ) : !platform.signedIn ? (
          <SignInPrompt label="Trust & safety stats are hidden" href="/admin/login" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            <StatTile
              label="Nurseries"
              value={`${platform.data.nurseriesByStatus?.approved ?? 0} approved`}
              description="Currently publishing"
              icon={Sprout}
              tone="sand"
              href="/admin/nurseries"
            />
            <StatTile
              label="Corporates"
              value={`${platform.data.corporatesByStatus?.approved ?? 0} approved`}
              description="Currently publishing"
              icon={Building2}
              tone="primary"
              href="/admin/corporates"
            />
            <StatTile label="Blocked accounts" value={platform.data.blockedUsersCount ?? 0} description="All account types" icon={ShieldBan} tone="primary" href="/admin/accounts" />
            <StatTile label="Open reports" value={platform.data.openReportsCount ?? 0} description="Awaiting review" icon={Flag} tone="sand" href="/admin/reports" />
            <StatTile label="Trees to review" value={platform.data.treesPendingReviewCount ?? 0} description="AI flagged/unverified" icon={TreePine} tone="primary" href="/admin/tree-verification" />
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-4">Content — ARTH site</h2>
        {content.loading ? (
          <div className="grid grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <StatTile key={i} loading />
            ))}
          </div>
        ) : !content.signedIn ? (
          <SignInPrompt label="Content stats are hidden" href="/admin/login" />
        ) : (
          <div className="grid grid-cols-2 gap-5">
            <StatTile
              label="Competition entries"
              value={content.data.competitionEntries}
              description="All-time submissions"
              icon={FileStack}
              tone="primary"
              href="/admin/competitions"
            />
            <StatTile label="Newsletter subscribers" value={content.data.newsletterSubscribers} description="Opted in" icon={Mail} tone="sand" />
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/ngos">Review NGOs</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/content">Manage content</Link>
        </Button>
      </div>
    </DashboardPageShell>
  )
}

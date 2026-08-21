'use client'

import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { CalendarDays, Cloud, Heart, IndianRupee, MapPin, Sprout, TreePine } from 'lucide-react'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import StatTile from '@/components/dashboard/StatTile'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../proxy'

function TrendChart({ title, data, color }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
      <p className="font-serif text-lg">{title}</p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function ReportsClient() {
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/ngo/reports')
      .then(setReports)
      .catch(() => setReports(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-8">
      <div>
        <p className="eyebrow text-primary">Reports</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Your impact, in full</h1>
        <p className="mt-2 text-sm text-muted-foreground">A complete view of everything your organization has achieved.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <StatTile label="Trees available" value={reports?.treesAvailable ?? 0} icon={TreePine} tone="primary" loading={loading} />
        <StatTile label="Trees adopted" value={reports?.treesAdopted ?? 0} icon={Sprout} tone="sand" loading={loading} />
        <StatTile label="Communities reached" value={reports?.communitiesReached ?? 0} icon={MapPin} tone="primary" loading={loading} />
        <StatTile label="CO2 absorption potential" value={`${reports?.co2AbsorptionKg ?? 0} kg`} icon={Cloud} tone="sand" loading={loading} />
        <StatTile label="Volunteers involved" value={reports?.volunteersInvolved ?? 0} icon={Heart} tone="primary" loading={loading} />
        <StatTile
          label="Total raised"
          value={`₹${((reports?.totalRaisedCents ?? 0) / 100).toLocaleString()}`}
          icon={IndianRupee}
          tone="sand"
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TrendChart title="Donations" data={reports?.monthly?.donations ?? []} color="hsl(var(--sand))" />
          <TrendChart title="RSVPs" data={reports?.monthly?.rsvps ?? []} color="hsl(var(--primary))" />
          <TrendChart title="Adoptions" data={reports?.monthly?.adoptions ?? []} color="hsl(var(--olive))" />
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" /> Trends cover the last 6 months.
      </p>
    </DashboardPageShell>
  )
}

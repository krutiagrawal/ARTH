'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TreePine, Sprout, ShieldCheck, Leaf, HeartHandshake, Cloud } from 'lucide-react'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import StatTile from '@/components/dashboard/StatTile'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../proxy'

export default function ImpactClient() {
  const [impact, setImpact] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/nursery/impact')
      .then(setImpact)
      .catch((err) => toast.error(err.message || 'Could not load impact.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Impact</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Your impact so far</h1>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-3xl" />
      ) : (
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center soft-shadow">
          <p className="eyebrow text-primary">🌳 Trees Growing Through You</p>
          <p className="font-serif text-5xl md:text-6xl mt-3">{impact?.treesGrowingThroughYou ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">Saplings you supplied that are now growing trees.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatTile label="Saplings supplied" value={impact?.totalSaplingsSupplied ?? 0} icon={Sprout} loading={loading} />
        <StatTile label="Verified planted" value={`${impact?.verificationPercentage ?? 0}%`} icon={ShieldCheck} tone="sand" loading={loading} />
        <StatTile label="Species offered" value={impact?.speciesCount ?? 0} icon={Leaf} loading={loading} />
        <StatTile label="NGO drives supported" value={impact?.ngoDrivesSupported ?? 0} icon={HeartHandshake} tone="sand" loading={loading} />
      </div>

      {!loading && (
        <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex items-center gap-3 max-w-md">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Cloud className="h-4 w-4" />
          </span>
          <div>
            <p className="font-serif text-xl leading-none">{impact?.estimatedCo2Kg ?? 0} kg</p>
            <p className="text-xs text-muted-foreground mt-1">Estimated CO₂ absorption potential.</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
        <div className="flex items-center gap-2 mb-4">
          <TreePine className="h-4 w-4 text-primary" />
          <p className="font-serif text-lg">Monthly supply trend</p>
        </div>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !impact?.monthlyTrend?.length ? (
          <p className="text-sm text-muted-foreground">Not enough data yet to show a trend.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={impact.monthlyTrend} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="impactTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#impactTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

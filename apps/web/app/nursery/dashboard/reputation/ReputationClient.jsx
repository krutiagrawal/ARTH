'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Package, Leaf, Globe2, Handshake, ShieldCheck } from 'lucide-react'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { proxy } from '../proxy'

// Tenure + lifetime-volume tiers — independent of ARTH Trust Score. Mirrors
// apps/mobile/src/components/common/GrowthLevelBadge.tsx's GROWTH_LEVEL_META (same tiers,
// separate platform-native copy, same convention as this app's other client-mirrored constants).
export const GROWTH_LEVEL_META = {
  seedling: { emoji: '🌱', label: 'Seedling', style: 'bg-secondary text-secondary-foreground' },
  growing: { emoji: '🪴', label: 'Growing', style: 'bg-primary/15 text-primary' },
  established: { emoji: '🌳', label: 'Established', style: 'bg-sand/25 text-accent' },
  evergreen: { emoji: '🌲', label: 'Evergreen', style: 'bg-foreground text-background' },
}

const FACTOR_LABEL = {
  fulfilment: 'Order fulfilment',
  rating: 'Buyer ratings',
  inventoryFreshness: 'Inventory freshness',
  responsiveness: 'Responsiveness',
}

function StreakCard({ icon: Icon, title, subtitle, current, longest, unit = 'weeks', weeks }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-serif text-base leading-none">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div>
          <p className="font-serif text-2xl leading-none">{current}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Current {unit}</p>
        </div>
        <div>
          <p className="font-serif text-2xl leading-none">{longest}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Best {unit}</p>
        </div>
      </div>
      {weeks && weeks.length > 0 && (
        <div className="mt-4 flex gap-1 flex-wrap">
          {weeks.map((w, i) => (
            <div key={i} className={cn('h-3 w-3 rounded-sm', w.met ? 'bg-primary' : 'bg-secondary')} title={w.week} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReputationClient() {
  const [reputation, setReputation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/nursery/reputation?weeks=12')
      .then(setReputation)
      .catch((err) => toast.error(err.message || 'Could not load reputation.'))
      .finally(() => setLoading(false))
  }, [])

  const growthMeta = GROWTH_LEVEL_META[reputation?.growthLevel || 'seedling']

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Growth & Trust</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Built from real ARTH activity</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Orders fulfilled, inventory kept fresh, and NGO partnerships — not a daily check-in.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 soft-shadow">
          <p className="eyebrow text-primary flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> ARTH Trust Score
          </p>
          {loading ? (
            <Skeleton className="h-10 w-24 mt-3" />
          ) : reputation?.trustScore == null ? (
            <p className="font-serif text-2xl mt-3 text-muted-foreground">Not yet verified</p>
          ) : (
            <>
              <p className="font-serif text-5xl mt-3">{reputation.trustScore}</p>
              <div className="mt-4 space-y-1.5">
                {reputation.trustScoreFactors &&
                  Object.entries(reputation.trustScoreFactors).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{FACTOR_LABEL[key] || key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
          <p className="eyebrow text-primary">Growth Level</p>
          {loading ? (
            <Skeleton className="h-10 w-32 mt-3" />
          ) : (
            <>
              <Badge className={cn('mt-3 text-sm px-3 py-1', growthMeta.style)}>
                {growthMeta.emoji} {growthMeta.label}
              </Badge>
              {reputation?.growthProgress?.nextLevel && (
                <p className="text-xs text-muted-foreground mt-3">
                  {reputation.growthProgress.suppliedToNext > 0 &&
                    `${reputation.growthProgress.suppliedToNext} more saplings supplied`}
                  {reputation.growthProgress.monthsToNext ? ` · ${reputation.growthProgress.monthsToNext} mo` : ''} to{' '}
                  {GROWTH_LEVEL_META[reputation.growthProgress.nextLevel].label}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StreakCard
            icon={Package}
            title="Supply Streak"
            subtitle="Fulfilled an ARTH order this week"
            current={reputation.streaks.supply.current}
            longest={reputation.streaks.supply.longest}
            weeks={reputation.streaks.supply.weeks}
          />
          <StreakCard
            icon={Leaf}
            title="Inventory Freshness"
            subtitle="Kept stock listings up to date"
            current={reputation.streaks.inventoryFreshness.current}
            longest={reputation.streaks.inventoryFreshness.longest}
            weeks={reputation.streaks.inventoryFreshness.weeks}
          />
          <StreakCard
            icon={Globe2}
            title="ARTH Contribution"
            subtitle="Any meaningful activity on ARTH"
            current={reputation.streaks.arthContribution.current}
            longest={reputation.streaks.arthContribution.longest}
            weeks={reputation.streaks.arthContribution.weeks}
          />
          <StreakCard
            icon={Handshake}
            title="Fulfilment Streak"
            subtitle="Orders fulfilled with no cancellations"
            current={reputation.fulfilmentStreak.current}
            longest={reputation.fulfilmentStreak.max}
            unit="orders"
          />
        </div>
      )}
    </DashboardPageShell>
  )
}

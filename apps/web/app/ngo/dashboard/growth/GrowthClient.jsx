'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NotebookPen, Handshake, TreeDeciduous, Trophy, ShieldCheck } from 'lucide-react'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { proxy } from '../proxy'

// Tenure + lifetime-impact tiers — independent of ARTH Trust Score. Mirrors
// apps/mobile/src/screens/NgoStreakBadgesScreen.tsx's NGO_GROWTH_LEVEL_META (same tiers,
// separate platform-native copy, same convention nursery's ReputationClient.jsx follows).
export const GROWTH_LEVEL_META = {
  seedling: { emoji: '🌱', label: 'Seedling', style: 'bg-secondary text-secondary-foreground' },
  growing: { emoji: '🪴', label: 'Growing', style: 'bg-primary/15 text-primary' },
  established: { emoji: '🌳', label: 'Established', style: 'bg-sand/25 text-accent' },
  evergreen: { emoji: '🌲', label: 'Evergreen', style: 'bg-foreground text-background' },
}

const TRUST_FACTOR_LABEL = {
  driveCompletion: 'Drive completion',
  updateFreshness: 'Update freshness',
  complianceCompleteness: 'Compliance completeness',
}

const RARITY_STYLE = {
  common: 'bg-secondary text-secondary-foreground',
  rare: 'bg-primary/15 text-primary',
  epic: 'bg-sand/25 text-accent',
  legendary: 'bg-foreground text-background',
}

function StreakCard({ icon: Icon, title, subtitle, current, longest, weeks }) {
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
          <p className="text-[11px] text-muted-foreground mt-1">Current weeks</p>
        </div>
        <div>
          <p className="font-serif text-2xl leading-none">{longest}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Best weeks</p>
        </div>
      </div>
      {weeks.length > 0 && (
        <div className="mt-4 flex gap-1 flex-wrap">
          {weeks.map((w, i) => (
            <div key={i} className={cn('h-3 w-3 rounded-sm', w.met ? 'bg-primary' : 'bg-secondary')} title={w.week} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GrowthClient() {
  const [reputation, setReputation] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      proxy('/ngo/reputation?weeks=12'),
      proxy('/ngo/achievements'),
      proxy('/ngo/leaderboard?limit=5'),
    ])
      .then(([rep, badges, board]) => {
        setReputation(rep)
        setAchievements(badges)
        setLeaderboard(board)
      })
      .catch((err) => toast.error(err.message || 'Could not load growth & trust data.'))
      .finally(() => setLoading(false))
  }, [])

  const growthMeta = GROWTH_LEVEL_META[reputation?.growthLevel || 'seedling']

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Growth & Trust</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Built from real ARTH activity</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Drives run, updates posted, and impact logged.
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
                      <span className="text-muted-foreground">{TRUST_FACTOR_LABEL[key] || key}</span>
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
                  {reputation.growthProgress.treesToNext > 0 &&
                    `${reputation.growthProgress.treesToNext} more trees planted`}
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
            icon={NotebookPen}
            title="Update Streak"
            subtitle="Posted an update this week"
            current={reputation.streaks.updates.current}
            longest={reputation.streaks.updates.longest}
            weeks={reputation.streaks.updates.weeks}
          />
          <StreakCard
            icon={Handshake}
            title="Drive Activity Streak"
            subtitle="Created or completed a drive this week"
            current={reputation.streaks.driveActivity.current}
            longest={reputation.streaks.driveActivity.longest}
            weeks={reputation.streaks.driveActivity.weeks}
          />
          <StreakCard
            icon={TreeDeciduous}
            title="Impact Verification Streak"
            subtitle="Logged planted trees or drive attendance"
            current={reputation.streaks.impactVerification.current}
            longest={reputation.streaks.impactVerification.longest}
            weeks={reputation.streaks.impactVerification.weeks}
          />
          <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Trophy className="h-4 w-4" />
              </span>
              <p className="font-serif text-base leading-none">Leaderboard</p>
            </div>
            <p className="font-serif text-3xl mt-4">
              {leaderboard?.myRank ? `#${leaderboard.myRank}` : 'Unranked'}
              <span className="text-sm font-sans text-muted-foreground ml-2">of {leaderboard?.totalNgos ?? 0} NGOs</span>
            </p>
            <div className="mt-4 space-y-2">
              {(leaderboard?.entries ?? []).slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-muted-foreground">#{entry.rank}</span>
                  <span className="flex-1 truncate font-medium">{entry.orgName}</span>
                  <span className="text-muted-foreground">{entry.treesPlanted} trees</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow text-primary mb-3">Badges</p>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No badges yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'rounded-2xl border border-border/70 bg-card p-4 soft-shadow',
                  !a.unlocked && 'opacity-50',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{a.icon}</span>
                  {a.rarity && <Badge className={cn('text-[10px] capitalize', RARITY_STYLE[a.rarity])}>{a.rarity}</Badge>}
                </div>
                <p className="text-sm font-medium mt-2">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                {a.total != null && (
                  <p className="text-[11px] text-muted-foreground mt-2">{a.progress} / {a.total}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

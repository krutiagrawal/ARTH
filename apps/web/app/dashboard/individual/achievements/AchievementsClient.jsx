'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Award, Flame, Zap, Lock, Snowflake, Sparkles } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { useAuth } from '@/components/site/AuthProvider'
import { proxy } from '@/lib/memberProxy'
import { cn } from '@/lib/utils'

const RARITY_STYLE = {
  common: 'bg-secondary text-secondary-foreground',
  rare: 'bg-primary/15 text-primary',
  epic: 'bg-sand/25 text-accent',
  legendary: 'bg-foreground text-background',
}

const XP_REASON_LABEL = {
  tree_planted: 'Planted a tree',
  mission_completed: 'Completed a mission',
  achievement_unlocked: 'Unlocked an achievement',
  challenge_completed: 'Completed a challenge',
  streak_saved_xp_spend: 'Spent XP to save streak',
}

function AchievementsTab() {
  const [achievements, setAchievements] = useState(null)

  useEffect(() => {
    proxy('/achievements')
      .then(setAchievements)
      .catch((err) => toast.error(err.message || 'Could not load achievements.'))
  }, [])

  if (achievements === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-3xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={cn(
            'rounded-3xl border p-5 soft-shadow',
            a.unlocked ? 'border-primary/40 bg-card' : 'border-border/60 bg-card/60'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl',
                a.unlocked ? 'bg-primary/15' : 'bg-secondary grayscale opacity-60'
              )}
            >
              {a.unlocked ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
            </span>
            <Badge className={cn('shrink-0 capitalize', RARITY_STYLE[a.rarity] || RARITY_STYLE.common)}>
              {a.rarity}
            </Badge>
          </div>
          <h3 className="font-serif text-lg mt-3">{a.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
          {a.total != null && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (a.progress / a.total) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {a.progress} / {a.total}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function StreaksTab() {
  const { user, refresh } = useAuth()
  const [weeks, setWeeks] = useState(null)
  const [protecting, setProtecting] = useState(false)

  useEffect(() => {
    proxy('/streaks/calendar?weeks=8')
      .then(setWeeks)
      .catch((err) => toast.error(err.message || 'Could not load streak calendar.'))
  }, [])

  const protectWithFreeze = async () => {
    setProtecting(true)
    try {
      await proxy('/streaks/protect', { method: 'POST', body: { method: 'freeze' } })
      toast.success('Streak protected with a freeze.')
      await refresh()
    } catch (err) {
      toast.error(err.message || 'Could not protect streak.')
    } finally {
      setProtecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
          <p className="eyebrow text-primary">Current streak</p>
          <p className="font-serif text-3xl mt-2 flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" /> {user?.streakCurrent ?? 0} days
          </p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
          <p className="eyebrow text-primary">Best streak</p>
          <p className="font-serif text-3xl mt-2">{user?.streakMax ?? 0} days</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex flex-col justify-between">
          <div>
            <p className="eyebrow text-primary">Freezes available</p>
            <p className="font-serif text-3xl mt-2 flex items-center gap-2">
              <Snowflake className="h-5 w-5" /> {user?.streakFreezesAvailable ?? 0}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 rounded-full self-start"
            disabled={!user?.streakFreezesAvailable || protecting}
            onClick={protectWithFreeze}
          >
            {protecting ? 'Protecting…' : 'Protect today with a freeze'}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
        <p className="font-serif text-lg mb-4">Planting calendar</p>
        {weeks === null ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {weeks.map((w) => (
              <div key={w.week} className="flex flex-col gap-1.5 shrink-0">
                {w.days.map((planted, i) => (
                  <div
                    key={i}
                    className={cn('h-4 w-4 rounded-sm', planted ? 'bg-primary' : 'bg-secondary')}
                    title={planted ? 'Planted' : 'No activity'}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function XpHistoryTab() {
  const [page, setPage] = useState(1)
  const [transactions, setTransactions] = useState(null)

  useEffect(() => {
    setTransactions(null)
    proxy(`/xp/transactions?page=${page}&limit=20`)
      .then(setTransactions)
      .catch((err) => toast.error(err.message || 'Could not load XP history.'))
  }, [page])

  return (
    <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
      {transactions === null ? (
        <div className="p-6 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : transactions.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No XP activity {page > 1 ? 'on this page' : 'yet'}.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm truncate">{XP_REASON_LABEL[tx.reason] || tx.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={cn('text-sm font-medium shrink-0', tx.amount >= 0 ? 'text-primary' : 'text-destructive')}>
                {tx.amount >= 0 ? '+' : ''}
                {tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/60">
        <Button size="sm" variant="outline" className="rounded-full" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">Page {page}</span>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={!transactions || transactions.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function AchievementsClient() {
  return (
    <DashboardPageShell>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="eyebrow text-primary">Your progress</p>
          <h1 className="font-serif text-3xl">Achievements &amp; streaks</h1>
        </div>
      </div>

      <Tabs defaultValue="achievements" className="mt-6">
        <TabsList>
          <TabsTrigger value="achievements"><Award className="h-3.5 w-3.5" /> Achievements</TabsTrigger>
          <TabsTrigger value="streaks"><Flame className="h-3.5 w-3.5" /> Streaks</TabsTrigger>
          <TabsTrigger value="xp"><Zap className="h-3.5 w-3.5" /> XP history</TabsTrigger>
        </TabsList>
        <TabsContent value="achievements" className="mt-6">
          <AchievementsTab />
        </TabsContent>
        <TabsContent value="streaks" className="mt-6">
          <StreaksTab />
        </TabsContent>
        <TabsContent value="xp" className="mt-6">
          <XpHistoryTab />
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  )
}

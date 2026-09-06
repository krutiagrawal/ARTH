'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  MapPin,
  TreePine,
  Zap,
  TrendingUp,
  Flame,
  Leaf,
  Award,
  Sprout,
  Compass,
  HeartHandshake,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import StatTile from '@/components/dashboard/StatTile'
import { useAuth } from '@/components/site/AuthProvider'
import { proxy } from '@/lib/memberProxy'

function MissionsCard() {
  const [missions, setMissions] = useState(null)
  const [completing, setCompleting] = useState(null)

  useEffect(() => {
    proxy('/missions/today')
      .then(setMissions)
      .catch(() => setMissions([]))
  }, [])

  const complete = async (id) => {
    setCompleting(id)
    try {
      await proxy(`/missions/${id}/complete`, { method: 'POST' })
      setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, completed: true } : m)))
      toast.success('Mission complete — XP added.')
    } catch (err) {
      toast.error(err.message || 'Could not complete mission.')
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="font-serif text-lg leading-none">Today&rsquo;s missions</p>
          <p className="text-xs text-muted-foreground mt-1">Small, daily ways to earn XP.</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {missions === null ? (
          <>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </>
        ) : missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No missions today — check back tomorrow.</p>
        ) : (
          missions.map((m) => (
            <button
              key={m.id}
              onClick={() => !m.completed && complete(m.id)}
              disabled={m.completed || completing === m.id}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left transition hover:border-primary/40 disabled:cursor-default disabled:hover:border-border/60"
            >
              {m.completed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 min-w-0">
                <span className={`block text-sm truncate ${m.completed ? 'text-muted-foreground line-through' : ''}`}>
                  {m.title}
                </span>
                {m.description && (
                  <span className="block text-xs text-muted-foreground truncate">{m.description}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-primary">+{m.xpReward} XP</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function ExploreCard({ forests }) {
  const thumbs = forests.slice(0, 3)
  return (
    <Link
      href="/dashboard/individual/explore"
      className="group flex items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card p-5 soft-shadow transition hover:border-primary/40"
    >
      <div className="flex items-center gap-4 min-w-0">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Compass className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-serif text-lg leading-none">Explore</p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate">Places you&rsquo;ve touched &amp; the journal</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex -space-x-3">
          {thumbs.map((f) => (
            <div key={f.id} className="h-9 w-9 rounded-full border-2 border-card overflow-hidden bg-secondary">
              <img src={f.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-primary/15 group-hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}

export default function OverviewClient({ forests }) {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] || 'there'

  const co2 = typeof user?.totalCo2Absorbed === 'number' ? user.totalCo2Absorbed : 0

  return (
    <DashboardPageShell>
      <section>
        <p className="eyebrow text-primary">Dashboard · Planter</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl md:text-6xl leading-[1] text-balance">
              {user?.avatarEmoji ? `${user.avatarEmoji} ` : ''}Welcome back, {firstName}.
            </h1>
            <p className="mt-3 text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {user?.handle ? `@${user.handle}` : '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/explore"><Compass className="h-4 w-4" /> Explore</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/donate"><HeartHandshake className="h-4 w-4" /> Donate</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/adopt"><Sprout className="h-4 w-4" /> Adopt a tree</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatTile
            label="Trees planted"
            value={user?.treesPlantedCount ?? 0}
            icon={TreePine}
            tone="primary"
            href="/dashboard/individual/trees"
            loading={!user}
          />
          <StatTile label="XP" value={user?.xp ?? 0} icon={Zap} tone="sand" href="/dashboard/individual/achievements" loading={!user} />
          <StatTile label="Level" value={user?.level ?? 1} icon={TrendingUp} tone="primary" loading={!user} />
          <StatTile
            label="Streak"
            value={`${user?.streakCurrent ?? 0} days`}
            description={`Best: ${user?.streakMax ?? 0}`}
            icon={Flame}
            tone="sand"
            href="/dashboard/individual/achievements"
            loading={!user}
          />
          <StatTile label="CO₂ absorbed" value={`${co2.toFixed(1)} kg`} icon={Leaf} tone="primary" loading={!user} />
          <StatTile
            label="Badges"
            value={user?.badgesCount ?? 0}
            icon={Award}
            tone="sand"
            href="/dashboard/individual/achievements"
            loading={!user}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MissionsCard />
          </div>
          <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow flex flex-col justify-between">
            <div>
              <p className="eyebrow text-primary">Streak freezes</p>
              <p className="font-serif text-3xl mt-2">{user?.streakFreezesAvailable ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Save your streak on a day you can&rsquo;t plant.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-full self-start">
              <Link href="/dashboard/individual/achievements">Manage streak</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <ExploreCard forests={forests} />
        </div>
      </section>
    </DashboardPageShell>
  )
}

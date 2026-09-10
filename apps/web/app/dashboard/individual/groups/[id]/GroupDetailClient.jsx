'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, GraduationCap, Home, PartyPopper, Sprout, Trophy } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

const GOAL_TYPE_LABEL = {
  trees_planted_count: 'Trees planted',
  cities_count: 'Cities reached',
  streak_days: 'Streak days',
  rare_species_count: 'Rare species',
}

const TYPE_STYLE = {
  family: { icon: Home, className: 'bg-primary/20 text-primary' },
  school: { icon: GraduationCap, className: 'bg-sand/30 text-accent' },
  club: { icon: PartyPopper, className: 'bg-primary/20 text-primary' },
  other: { icon: Sprout, className: 'bg-sand/30 text-accent' },
}

function EmptyChallengesIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
      <circle cx="60" cy="60" r="58" fill="hsl(38 48% 68% / 0.15)" />
      <path d="M60 30 L68 50 L90 52 L73 66 L79 88 L60 76 L41 88 L47 66 L30 52 L52 50 Z" fill="hsl(38 48% 55%)" />
    </svg>
  )
}

export default function GroupDetailClient({ groupId }) {
  const [group, setGroup] = useState(null)
  const [challenges, setChallenges] = useState(null)
  const [joiningId, setJoiningId] = useState(null)

  const load = () => {
    proxy(`/groups/${groupId}`).then(setGroup).catch((err) => toast.error(err.message || 'Could not load this group.'))
    proxy(`/groups/${groupId}/challenges`).then(setChallenges).catch(() => setChallenges([]))
  }

  useEffect(load, [groupId])

  const joinChallenge = async (challengeId) => {
    setJoiningId(challengeId)
    try {
      await proxy(`/groups/challenges/${challengeId}/join`, { method: 'POST' })
      toast.success("You're in!")
      load()
    } catch (err) {
      toast.error(err.message || 'Could not join this challenge.')
    } finally {
      setJoiningId(null)
    }
  }

  const style = group ? TYPE_STYLE[group.groupType] || TYPE_STYLE.other : null
  const TypeIcon = style?.icon

  return (
    <DashboardPageShell className="max-w-3xl">
      <Link href="/dashboard/individual/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All groups
      </Link>

      {group ? (
        <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow flex items-start gap-5">
          {group.logoUrl ? (
            <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-secondary">
              <img src={resolveMediaUrl(group.logoUrl)} alt={group.groupName} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className={`h-16 w-16 shrink-0 grid place-items-center rounded-2xl ${style.className}`}>
              <TypeIcon className="h-7 w-7" />
            </div>
          )}
          <div>
            <p className="eyebrow text-primary capitalize">{group.groupType}</p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1">{group.groupName}</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg">{group.description}</p>
          </div>
        </div>
      ) : (
        <Skeleton className="h-28 w-full rounded-3xl" />
      )}

      <div>
        <h2 className="font-serif text-xl mb-4">Challenges</h2>
        <div className="space-y-3">
          {challenges === null ? (
            <Skeleton className="h-28 w-full rounded-3xl" />
          ) : challenges.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
              <EmptyChallengesIllustration />
              <p className="mt-4 text-sm text-muted-foreground">No challenges yet – check back soon.</p>
            </div>
          ) : (
            challenges.map((c) => (
              <div key={c.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Trophy className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">{GOAL_TYPE_LABEL[c.goalType]}</Badge>
                </div>
                <div className="mt-4 max-w-xs">
                  <Progress value={Math.min(100, (c.progress / c.goalTotal) * 100)} />
                  <p className="text-xs text-muted-foreground mt-1.5">{c.progress} / {c.goalTotal} · ends {new Date(c.endsAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-full mt-4" disabled={joiningId === c.id} onClick={() => joinChallenge(c.id)}>
                  {joiningId === c.id ? 'Joining…' : 'Join challenge'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Trophy } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../../../proxy'

const GOAL_TYPE_LABEL = {
  trees_planted_count: 'Trees planted',
  cities_count: 'Cities reached',
  streak_days: 'Streak days',
  rare_species_count: 'Rare species',
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

  return (
    <div className="max-w-3xl">
      <Link href="/app/groups" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All groups
      </Link>

      {group ? (
        <>
          <p className="eyebrow text-primary mt-6">{group.groupType}</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">{group.groupName}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">{group.description}</p>
        </>
      ) : (
        <Skeleton className="h-16 w-80 mt-6" />
      )}

      <h2 className="font-serif text-xl mt-10 mb-4">Challenges</h2>
      <div className="space-y-3">
        {challenges === null ? (
          <Skeleton className="h-24 w-full rounded-3xl" />
        ) : challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No challenges yet — check back soon.</p>
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="rounded-3xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> {c.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{GOAL_TYPE_LABEL[c.goalType]}</Badge>
              </div>
              <div className="mt-3 max-w-xs">
                <Progress value={Math.min(100, (c.progress / c.goalTotal) * 100)} />
                <p className="text-xs text-muted-foreground mt-1">{c.progress} / {c.goalTotal} · ends {new Date(c.endsAt).toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-full mt-3" disabled={joiningId === c.id} onClick={() => joinChallenge(c.id)}>
                {joiningId === c.id ? 'Joining…' : 'Join challenge'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

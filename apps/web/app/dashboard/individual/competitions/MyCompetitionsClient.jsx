'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Trophy, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

export default function MyCompetitionsClient() {
  const [data, setData] = useState(null)

  useEffect(() => {
    proxy('/competitions/mine')
      .then(setData)
      .catch((err) => toast.error(err.message || 'Could not load your competitions.'))
  }, [])

  const entries = data?.entries ?? null
  const votes = data?.votes ?? null

  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Competitions</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Your entries and votes.</h1>
        <p className="mt-2 text-sm text-muted-foreground">See what you've submitted and where you've cast a vote.</p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">My entries</TabsTrigger>
          <TabsTrigger value="votes">My votes</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-3 mt-4">
          {entries === null ? (
            <>
              <Skeleton className="h-20 w-full rounded-3xl" />
              <Skeleton className="h-20 w-full rounded-3xl" />
            </>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border border-border/70 bg-card p-8 text-center soft-shadow">
              <Trophy className="h-8 w-8 mx-auto text-primary" />
              <p className="mt-3 font-serif text-lg">No entries yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Enter a competition and track it here.</p>
              <Button asChild className="mt-5 rounded-full">
                <Link href="/competitions">Browse competitions</Link>
              </Button>
            </div>
          ) : (
            entries.map((e) => (
              <Link
                key={e.id}
                href={`/competitions/${e.competitionId}`}
                className="block rounded-3xl border border-border/70 bg-card p-5 soft-shadow transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.competitionTitle} · {new Date(e.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <ThumbsUp className="h-3 w-3" /> {e.votesCount}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="votes" className="space-y-3 mt-4">
          {votes === null ? (
            <>
              <Skeleton className="h-16 w-full rounded-3xl" />
              <Skeleton className="h-16 w-full rounded-3xl" />
            </>
          ) : votes.length === 0 ? (
            <div className="rounded-3xl border border-border/70 bg-card p-8 text-center soft-shadow">
              <ThumbsUp className="h-8 w-8 mx-auto text-primary" />
              <p className="mt-3 font-serif text-lg">No votes cast yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Support an entry in an open competition.</p>
              <Button asChild className="mt-5 rounded-full">
                <Link href="/competitions">Browse competitions</Link>
              </Button>
            </div>
          ) : (
            votes.map((v) => (
              <Link
                key={v.id}
                href={`/competitions/${v.competitionId}`}
                className="flex items-center justify-between gap-3 rounded-3xl border border-border/70 bg-card p-4 soft-shadow transition hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{v.entryTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.competitionTitle}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(v.createdAt).toLocaleDateString()}</span>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  )
}

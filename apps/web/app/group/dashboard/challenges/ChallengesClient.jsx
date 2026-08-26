'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ResourceFormSheet from '@/components/dashboard/ResourceFormSheet'
import { proxy } from '../proxy'

const GOAL_TYPE_LABEL = {
  trees_planted_count: 'Trees planted',
  cities_count: 'Cities reached',
  streak_days: 'Streak days',
  rare_species_count: 'Rare species',
}

const FIELDS = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  {
    name: 'goalType',
    label: 'Goal type',
    type: 'select',
    required: true,
    options: Object.entries(GOAL_TYPE_LABEL).map(([value, label]) => ({ value, label })),
  },
  { name: 'goalTotal', label: 'Goal total', type: 'number', required: true },
  { name: 'startsAt', label: 'Starts', type: 'datetime-local', required: true, toApi: (v) => new Date(v).toISOString() },
  { name: 'endsAt', label: 'Ends', type: 'datetime-local', required: true, toApi: (v) => new Date(v).toISOString() },
]

export default function ChallengesClient() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    proxy('/group/challenges').then(setChallenges).catch(() => setChallenges([])).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSubmit = async (payload) => {
    setSubmitting(true)
    try {
      await proxy('/group/challenges', { method: 'POST', body: payload })
      toast.success('Challenge created.')
      setDialogOpen(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Could not create this challenge.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
    () => [
      { accessorKey: 'title', header: 'Challenge' },
      {
        accessorKey: 'goalType',
        header: 'Goal',
        cell: ({ row }) => <Badge variant="outline">{GOAL_TYPE_LABEL[row.original.goalType]}</Badge>,
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row }) => (
          <div className="w-40">
            <Progress value={Math.min(100, (row.original.progress / row.original.goalTotal) * 100)} />
            <p className="text-xs text-muted-foreground mt-1">{row.original.progress} / {row.original.goalTotal}</p>
          </div>
        ),
      },
      { accessorKey: 'participantCount', header: 'Joined' },
      {
        accessorKey: 'endsAt',
        header: 'Ends',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.endsAt).toLocaleDateString()}</span>,
      },
    ],
    []
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Challenges</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Group challenges</h1>
        </div>
        <Button className="rounded-full gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New challenge
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={challenges}
        loading={loading}
        emptyState={<EmptyState icon={Trophy} title="No challenges yet" body="Set a shared goal for your members to plant toward together." actionLabel="New challenge" onAction={() => setDialogOpen(true)} />}
      />

      <ResourceFormSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        icon={Trophy}
        eyebrow="Group Dashboard"
        title="New challenge"
        description="Set a shared goal for your group to work toward."
        fields={FIELDS}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </DashboardPageShell>
  )
}

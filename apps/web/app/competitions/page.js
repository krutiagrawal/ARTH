import { prisma } from '@/lib/prisma'
import CompetitionsClient from './CompetitionsClient'

export default async function Page() {
  const competitions = await prisma.competition.findMany({ orderBy: { deadline: 'asc' } })
  const serialised = competitions.map((c) => ({ ...c, deadline: c.deadline.toISOString().slice(0, 10) }))
  return <CompetitionsClient competitions={serialised} />
}

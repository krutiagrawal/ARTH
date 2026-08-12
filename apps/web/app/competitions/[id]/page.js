import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import CompetitionDetailClient from './CompetitionDetailClient'

export default async function Page({ params }) {
  const { id } = await params
  const [comp, forests] = await Promise.all([
    prisma.competition.findUnique({ where: { id } }),
    prisma.forest.findMany(),
  ])
  if (!comp) return notFound()

  const serialisedComp = { ...comp, deadline: comp.deadline.toISOString() }
  return <CompetitionDetailClient comp={serialisedComp} forestImages={forests.map((f) => f.imageUrl)} />
}

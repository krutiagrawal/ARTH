// TODO(post-launch): re-enable competition detail pages alongside the
// competitions list (see ../page.js for why). To restore: delete the stub
// below and uncomment the original implementation.
import { notFound } from 'next/navigation'

export default function Page() {
  return notFound()
}

/* ORIGINAL IMPLEMENTATION — restore after launch:

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import CompetitionDetailClient from './CompetitionDetailClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  const c = await prisma.competition.findUnique({ where: { id } })
  if (!c) return {}
  return {
    title: c.title,
    description: c.tagline,
    openGraph: { title: c.title, description: c.tagline, images: [c.imageUrl] },
  }
}

export default async function Page({ params }) {
  const { id } = await params
  const comp = await prisma.competition.findUnique({ where: { id } })
  if (!comp) return notFound()

  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: id },
    include: { user: { select: { name: true } } },
    orderBy: { votesCount: 'desc' },
  })
  const serialisedEntries = entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    votes: e.votesCount,
    hasVoted: false,
  }))

  const serialisedComp = { ...comp, deadline: comp.deadline.toISOString() }
  return <CompetitionDetailClient comp={serialisedComp} initialEntries={serialisedEntries} />
}

*/

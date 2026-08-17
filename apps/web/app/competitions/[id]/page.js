import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
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
  const [comp, user] = await Promise.all([
    prisma.competition.findUnique({ where: { id } }),
    getServerUser(),
  ])
  if (!comp) return notFound()

  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: id },
    include: { user: { select: { name: true } }, voters: user ? { where: { userId: user.id }, select: { id: true } } : false },
    orderBy: { votes: 'desc' },
  })
  const serialisedEntries = entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString(), hasVoted: user ? e.voters.length > 0 : false, voters: undefined }))

  const serialisedComp = { ...comp, deadline: comp.deadline.toISOString() }
  return <CompetitionDetailClient comp={serialisedComp} initialEntries={serialisedEntries} isLoggedIn={Boolean(user)} />
}

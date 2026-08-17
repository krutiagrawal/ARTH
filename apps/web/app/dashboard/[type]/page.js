import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import DashboardClient from './DashboardClient'

const VALID_TYPES = ['individual', 'community', 'ngo', 'nursery', 'organisation']

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

async function loadRecentActivity() {
  const [trees, adoptions, rsvps, pledges] = await Promise.all([
    prisma.plantedTree.findMany({ take: 4, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
    prisma.adoption.findMany({ take: 4, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, tree: { select: { name: true } } } }),
    prisma.rsvp.findMany({ take: 4, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, drive: { select: { title: true } } } }),
    prisma.pledge.findMany({ take: 4, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
  ])

  const items = [
    ...trees.map((t) => ({ id: `tree-${t.id}`, createdAt: t.createdAt, text: `${t.user.name} planted a ${t.species}`, sub: t.location })),
    ...adoptions.map((a) => ({ id: `adopt-${a.id}`, createdAt: a.createdAt, text: `${a.user.name} adopted ${a.tree.name}`, sub: 'Legacy tree' })),
    ...rsvps.map((r) => ({ id: `rsvp-${r.id}`, createdAt: r.createdAt, text: `${r.user.name} joined ${r.drive.title}`, sub: 'Drive RSVP' })),
    ...pledges.map((p) => ({ id: `pledge-${p.id}`, createdAt: p.createdAt, text: `${p.user.name} pledged ₹${p.amount.toLocaleString('en-IN')} to ${p.ngo}`, sub: p.status === 'paid' ? 'Donated' : 'Pledged' })),
  ]

  return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
}

export default async function Page({ params }) {
  const { type } = await params
  if (!VALID_TYPES.includes(type)) return notFound()

  const [user, forests, blogs, activity] = await Promise.all([
    getServerUser(),
    prisma.forest.findMany({ take: 3 }),
    prisma.blog.findMany({ take: 3 }),
    loadRecentActivity(),
  ])

  const stats = user
    ? await (async () => {
        const [treesPlanted, treesAdopted, drivesJoined, pledgeAgg] = await Promise.all([
          prisma.plantedTree.count({ where: { userId: user.id } }),
          prisma.adoption.count({ where: { userId: user.id } }),
          prisma.rsvp.count({ where: { userId: user.id } }),
          prisma.pledge.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
        ])
        return { treesPlanted, treesAdopted, drivesJoined, pledgedAmount: pledgeAgg._sum.amount || 0 }
      })()
    : { treesPlanted: 0, treesAdopted: 0, drivesJoined: 0, pledgedAmount: 0 }

  return <DashboardClient type={type} forests={forests} blogs={blogs} stats={stats} activity={activity} />
}

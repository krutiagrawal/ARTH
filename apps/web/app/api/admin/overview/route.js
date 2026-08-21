import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

// Arth-native admin stats (apps/web's own DB, gated by User.isAdmin) — the
// counterpart to services/api's /api/admin/overview. Kept as its own route
// (not a services/api proxy) since it reads a completely different database.
export async function GET() {
  const user = await getServerUser()
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })
  }

  const [usersByAccountType, pledgeAggregate, competitionEntries, newsletterSubscribers] = await Promise.all([
    prisma.user.groupBy({ by: ['accountType'], _count: true }),
    prisma.pledge.aggregate({ where: { status: 'paid' }, _sum: { amount: true }, _count: true }),
    prisma.competitionEntry.count(),
    prisma.newsletterSubscriber.count(),
  ])

  return NextResponse.json({
    usersByAccountType: Object.fromEntries(usersByAccountType.map((r) => [r.accountType, r._count])),
    pledgesTotalAmount: pledgeAggregate._sum.amount ?? 0,
    pledgesCount: pledgeAggregate._count,
    competitionEntries,
    newsletterSubscribers,
  })
}

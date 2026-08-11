import { prisma } from '@/lib/prisma'
import LeaderboardsClient from './LeaderboardsClient'

const CATEGORY_ORDER = ['Individuals', 'Communities', 'NGOs', 'Cities', 'Schools', 'Companies', 'Forests']

export default async function Page() {
  const entries = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' } })
  const leaderboards = {}
  for (const category of CATEGORY_ORDER) {
    leaderboards[category] = entries.filter((e) => e.category === category)
  }
  return <LeaderboardsClient leaderboards={leaderboards} />
}

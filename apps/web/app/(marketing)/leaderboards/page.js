import { prisma } from '@/lib/prisma'
import LeaderboardsClient from './LeaderboardsClient'

export const metadata = {
  title: 'Leaderboards',
  description: 'See who is leading the movement — individuals, communities, NGOs and cities.',
}

const CATEGORY_ORDER = ['Individuals', 'Communities', 'NGOs', 'Cities', 'Schools', 'Companies', 'Forests']

// These two categories map cleanly onto the Arth user model (accountType + planted
// trees) so they're computed live. The rest (NGOs/Cities/Schools/Companies/Forests)
// have no equivalent real grouping yet and stay on the seeded LeaderboardEntry table.
const LIVE_CATEGORIES = {
  Individuals: 'individual',
  Communities: 'community',
}

async function loadLiveCategory(accountType) {
  const users = await prisma.user.findMany({
    where: { accountType, plantedTrees: { some: {} } },
    select: { name: true, place: true, _count: { select: { plantedTrees: true } } },
  })
  return users
    .map((u) => ({ name: u.name, place: u.place || '—', score: u._count.plantedTrees }))
    .sort((a, b) => b.score - a.score)
}

export default async function Page() {
  const entries = await prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' } })
  const leaderboards = {}
  for (const category of CATEGORY_ORDER) {
    if (LIVE_CATEGORIES[category]) {
      leaderboards[category] = await loadLiveCategory(LIVE_CATEGORIES[category])
    } else {
      leaderboards[category] = entries.filter((e) => e.category === category)
    }
  }
  return <LeaderboardsClient leaderboards={leaderboards} />
}

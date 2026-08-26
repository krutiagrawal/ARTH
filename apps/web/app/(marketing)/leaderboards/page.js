import { prisma } from '@/lib/prisma'
import LeaderboardsClient from './LeaderboardsClient'

export const metadata = {
  title: 'Leaderboards',
  description: 'See who is leading the movement — individuals, communities, NGOs and cities.',
}

const CATEGORY_ORDER = ['Individuals', 'Communities', 'NGOs', 'Cities', 'Schools', 'Companies', 'Forests']

// These two categories map cleanly onto the shared services/api user model (role +
// treesPlantedCount) so they're computed live. The rest (NGOs/Cities/Schools/
// Companies/Forests) have no equivalent real grouping yet and stay on the seeded
// LeaderboardEntry table.
const LIVE_CATEGORIES = {
  Individuals: 'user',
  Communities: 'group',
}

async function loadLiveCategory(role) {
  const users = await prisma.user.findMany({
    where: { role, treesPlantedCount: { gt: 0 } },
    select: { name: true, handle: true, treesPlantedCount: true },
  })
  return users
    .map((u) => ({ name: u.name, place: `@${u.handle}`, score: u.treesPlantedCount }))
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

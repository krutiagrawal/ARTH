import { prisma } from '@/lib/prisma'
import MissionClient from './MissionClient'

export const metadata = {
  title: 'Mission',
  description: 'ARTH exists to plant a forest we will not live to see fully grown – our story and our statement of intent.',
}

export default async function Page() {
  const [plantersCount, avatarUsers] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { avatarEmoji: true },
    }),
  ])
  const avatarEmojis = avatarUsers.map((u) => u.avatarEmoji)
  return <MissionClient plantersCount={plantersCount} avatarEmojis={avatarEmojis} />
}

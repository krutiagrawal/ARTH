import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import AdoptClient from './AdoptClient'

export default async function Page() {
  const [user, trees] = await Promise.all([
    getServerUser(),
    prisma.legacyTree.findMany({ orderBy: { id: 'asc' } }),
  ])
  const mine = user
    ? await prisma.adoption.findMany({ where: { userId: user.id } })
    : []
  return <AdoptClient trees={trees} initialAdoptedIds={mine.map((a) => a.treeId)} />
}

import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import PlantClient from './PlantClient'

export default async function Page() {
  const user = await getServerUser()
  const mine = user
    ? await prisma.plantedTree.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    : []
  return <PlantClient initialTrees={mine} />
}

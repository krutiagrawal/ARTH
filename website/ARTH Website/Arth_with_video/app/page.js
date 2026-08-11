import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

export default async function Page() {
  const tree = await prisma.legacyTree.findUnique({ where: { id: 'the-first-sapling' } })
  const namingExample = tree
    ? { name: tree.name, quote: tree.quote }
    : { name: 'The First Sapling', quote: 'A promise to my daughter. On her tenth birthday she watered it herself.' }
  return <HomeClient namingExample={namingExample} />
}

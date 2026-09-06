import { prisma } from '@/lib/prisma'
import OverviewClient from './OverviewClient'

export default async function Page() {
  const forests = await prisma.forest.findMany({ take: 3 })

  return <OverviewClient forests={forests} />
}

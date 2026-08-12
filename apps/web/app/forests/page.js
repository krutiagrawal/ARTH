import { prisma } from '@/lib/prisma'
import ForestsClient from './ForestsClient'

export default async function Page() {
  const forests = await prisma.forest.findMany({ orderBy: { id: 'asc' } })
  return <ForestsClient forests={forests} />
}

import { prisma } from '@/lib/prisma'
import ForestsClient from './ForestsClient'

export const metadata = {
  title: 'Forests',
  description: 'The living forests ARTH and its partners are growing around the world.',
}

export default async function Page() {
  const forests = await prisma.forest.findMany({ orderBy: { id: 'asc' } })
  return <ForestsClient forests={forests} />
}

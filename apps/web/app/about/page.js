import { prisma } from '@/lib/prisma'
import AboutClient from './AboutClient'

export default async function Page() {
  const timeline = await prisma.timelineEntry.findMany({ orderBy: { year: 'asc' } })
  return <AboutClient timeline={timeline} />
}

import { prisma } from '@/lib/prisma'
import AboutClient from './AboutClient'

export const metadata = {
  title: 'About',
  description: 'The story of ARTH — a global movement planting, tracking and protecting trees together.',
}

export default async function Page() {
  const timeline = await prisma.timelineEntry.findMany({ orderBy: { year: 'asc' } })
  return <AboutClient timeline={timeline} />
}

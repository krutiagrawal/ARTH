import { prisma } from '@/lib/prisma'
import ExploreClient from './ExploreClient'

export const metadata = {
  title: 'Explore',
  robots: { index: false, follow: false },
}

export default async function Page() {
  const [forests, blogs] = await Promise.all([
    prisma.forest.findMany({ take: 12, orderBy: { trees: 'desc' } }),
    prisma.blog.findMany({ take: 12 }),
  ])

  return <ExploreClient forests={forests} blogs={blogs} />
}

import { prisma } from '@/lib/prisma'
import ExploreClient from './ExploreClient'

export const metadata = {
  title: 'Explore',
  description: 'Everything on ARTH in one place — forests, trees, competitions and journal entries.',
}

export default async function Page() {
  // TODO(post-launch): bring `competitions` back into the mix once
  // app/(marketing)/competitions is re-enabled (see its page.js) — until then
  // its detail pages 404, so leave it out of Explore's results.
  const [forests, trees, blogs] = await Promise.all([
    prisma.forest.findMany(),
    prisma.legacyTree.findMany(),
    prisma.blog.findMany(),
  ])

  const items = [
    ...forests.map((x) => ({ type: 'Forests', id: x.id, title: x.name, sub: x.location, img: x.imageUrl, href: `/forests/${x.id}` })),
    ...trees.map((x) => ({ type: 'Trees', id: x.id, title: x.name, sub: `${x.species} · ${x.location}`, img: x.imageUrl, href: `/trees/${x.id}` })),
    ...blogs.map((x) => ({ type: 'Stories', id: x.id, title: x.title, sub: `${x.category} · ${x.author}`, img: x.imageUrl, href: `/blogs/${x.id}` })),
  ]

  return <ExploreClient items={items} />
}

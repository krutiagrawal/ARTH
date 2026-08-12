import { prisma } from '@/lib/prisma'
import ExploreClient from './ExploreClient'

export default async function Page() {
  const [forests, trees, competitions, blogs] = await Promise.all([
    prisma.forest.findMany(),
    prisma.legacyTree.findMany(),
    prisma.competition.findMany(),
    prisma.blog.findMany(),
  ])

  const items = [
    ...forests.map((x) => ({ type: 'Forests', id: x.id, title: x.name, sub: x.location, img: x.imageUrl, href: `/forests/${x.id}` })),
    ...trees.map((x) => ({ type: 'Trees', id: x.id, title: x.name, sub: `${x.species} · ${x.location}`, img: x.imageUrl, href: `/trees/${x.id}` })),
    ...competitions.map((x) => ({ type: 'Competitions', id: x.id, title: x.title, sub: x.tagline, img: x.imageUrl, href: `/competitions/${x.id}` })),
    ...blogs.map((x) => ({ type: 'Stories', id: x.id, title: x.title, sub: `${x.category} · ${x.author}`, img: x.imageUrl, href: `/blogs/${x.id}` })),
  ]

  return <ExploreClient items={items} />
}

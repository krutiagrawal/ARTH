import { prisma } from '@/lib/prisma'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const STATIC_ROUTES = [
  '', '/about', '/mission', '/how-it-works', '/explore', '/forests', '/competitions',
  '/leaderboards', '/blogs', '/partners', '/contact', '/donate', '/adopt', '/drives',
  '/plant', '/register', '/login', '/privacy', '/terms', '/faq',
]

export default async function sitemap() {
  const [forests, blogs, competitions, trees, ecosystemEntries] = await Promise.all([
    prisma.forest.findMany({ select: { id: true } }),
    prisma.blog.findMany({ select: { id: true } }),
    prisma.competition.findMany({ select: { id: true } }),
    prisma.legacyTree.findMany({ select: { id: true } }),
    prisma.ecosystemEntry.findMany({ select: { id: true } }),
  ])

  const staticEntries = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }))

  const dynamicEntries = [
    ...forests.map((f) => ({ url: `${SITE_URL}/forests/${f.id}`, lastModified: new Date() })),
    ...blogs.map((b) => ({ url: `${SITE_URL}/blogs/${b.id}`, lastModified: new Date() })),
    ...competitions.map((c) => ({ url: `${SITE_URL}/competitions/${c.id}`, lastModified: new Date() })),
    ...trees.map((t) => ({ url: `${SITE_URL}/trees/${t.id}`, lastModified: new Date() })),
    ...ecosystemEntries.map((e) => ({ url: `${SITE_URL}/ecosystem/${e.id}`, lastModified: new Date() })),
  ]

  return [...staticEntries, ...dynamicEntries]
}

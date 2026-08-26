import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

const VALID_TYPES = ['individual', 'group', 'ngo', 'nursery', 'corporate']

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { type } = await params
  if (!VALID_TYPES.includes(type)) return notFound()

  const [forests, blogs] = await Promise.all([
    prisma.forest.findMany({ take: 3 }),
    prisma.blog.findMany({ take: 3 }),
  ])

  return <DashboardClient type={type} forests={forests} blogs={blogs} />
}

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardClient from './DashboardClient'

// 'individual' now lives at the static apps/web/app/dashboard/individual/*
// route tree, which Next.js shadows ahead of this dynamic segment — kept out
// of VALID_TYPES so a stray link here 404s instead of double-serving it.
const VALID_TYPES = ['group', 'ngo', 'nursery', 'corporate']

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

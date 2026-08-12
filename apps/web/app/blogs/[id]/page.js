import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BlogDetailClient from './BlogDetailClient'

export default async function Page({ params }) {
  const { id } = await params
  const b = await prisma.blog.findUnique({ where: { id } })
  if (!b) return notFound()
  const others = (await prisma.blog.findMany({ where: { id: { not: id } } })).slice(0, 3)
  return <BlogDetailClient blog={b} others={others} />
}

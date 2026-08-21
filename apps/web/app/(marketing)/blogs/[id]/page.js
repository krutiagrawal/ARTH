import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BlogDetailClient from './BlogDetailClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  const b = await prisma.blog.findUnique({ where: { id } })
  if (!b) return {}
  return {
    title: b.title,
    description: b.excerpt,
    openGraph: { title: b.title, description: b.excerpt, images: [b.imageUrl] },
  }
}

export default async function Page({ params }) {
  const { id } = await params
  const b = await prisma.blog.findUnique({ where: { id } })
  if (!b) return notFound()
  const others = (await prisma.blog.findMany({ where: { id: { not: id } } })).slice(0, 3)
  return <BlogDetailClient blog={b} others={others} />
}

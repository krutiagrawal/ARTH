import { prisma } from '@/lib/prisma'
import BlogsClient from './BlogsClient'

export default async function Page() {
  const blogs = await prisma.blog.findMany({ orderBy: { id: 'asc' } })
  const featured = blogs.find((b) => b.id === 'why-native-species-matter') ?? blogs[0]
  const rest = blogs.filter((b) => b.id !== featured.id)
  return <BlogsClient featured={featured} blogs={rest} />
}

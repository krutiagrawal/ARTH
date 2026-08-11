import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

const createSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  location: z.string().min(1),
  message: z.string().optional(),
})

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const trees = await prisma.plantedTree.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ trees })
}

export async function POST(request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in a name and location.' }, { status: 400 })
  }

  const tree = await prisma.plantedTree.create({
    data: { userId: user.id, ...parsed.data, message: parsed.data.message || null },
  })
  return NextResponse.json({ tree }, { status: 201 })
}

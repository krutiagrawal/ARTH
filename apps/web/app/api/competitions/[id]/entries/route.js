import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url().optional(),
})

export async function GET(request, { params }) {
  const { id } = await params
  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: id },
    include: { user: { select: { name: true } } },
    orderBy: { votes: 'desc' },
  })
  return NextResponse.json({ entries })
}

export async function POST(request, { params }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please add a title and description for your entry.' }, { status: 400 })
  }

  const competition = await prisma.competition.findUnique({ where: { id } })
  if (!competition) return NextResponse.json({ error: 'Competition not found.' }, { status: 404 })

  const [entry] = await prisma.$transaction([
    prisma.competitionEntry.create({
      data: { competitionId: id, userId: user.id, ...parsed.data, imageUrl: parsed.data.imageUrl || null },
    }),
    prisma.competition.update({ where: { id }, data: { entries: { increment: 1 } } }),
  ])

  return NextResponse.json({ entry }, { status: 201 })
}

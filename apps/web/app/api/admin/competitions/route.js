import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAdmin } from '@/lib/requireApiAdmin'

export async function GET(request) {
  const admin = await requireApiAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const entries = await prisma.competitionEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      competition: { select: { title: true } },
    },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      imageUrl: e.imageUrl,
      votes: e.votesCount,
      createdAt: e.createdAt,
      entrant: e.user.name,
      competitionTitle: e.competition.title,
    })),
  })
}

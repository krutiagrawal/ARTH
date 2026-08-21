import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !user.isAdmin) return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
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
      votes: e.votes,
      createdAt: e.createdAt,
      entrant: e.user.name,
      competitionTitle: e.competition.title,
    })),
  })
}

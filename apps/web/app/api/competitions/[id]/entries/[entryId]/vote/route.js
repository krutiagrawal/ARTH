import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

export async function POST(request, { params }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { entryId } = await params

  try {
    const [, entry] = await prisma.$transaction([
      prisma.competitionEntryVote.create({ data: { entryId, userId: user.id } }),
      prisma.competitionEntry.update({ where: { id: entryId }, data: { votes: { increment: 1 } } }),
    ])
    return NextResponse.json({ entry }, { status: 201 })
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'You have already voted for this entry.' }, { status: 409 })
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
    }
    throw err
  }
}

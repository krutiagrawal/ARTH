import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

const createSchema = z.object({
  driveId: z.string().min(1),
})

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const rsvps = await prisma.rsvp.findMany({
    where: { userId: user.id },
    include: { drive: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    rsvps: rsvps.map((r) => ({ id: r.id, driveId: r.driveId, driveTitle: r.drive.title, createdAt: r.createdAt })),
  })
}

export async function POST(request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A drive must be selected.' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const drive = await tx.drive.findUnique({ where: { id: parsed.data.driveId } })
      if (!drive) throw new Error('NOT_FOUND')
      if (drive.spotsLeft <= 0) throw new Error('FULL')

      await tx.drive.update({ where: { id: drive.id }, data: { spotsLeft: { decrement: 1 } } })
      const rsvp = await tx.rsvp.create({ data: { userId: user.id, driveId: drive.id } })
      return { rsvp, driveTitle: drive.title }
    })

    return NextResponse.json({ rsvp: { id: result.rsvp.id, driveId: result.rsvp.driveId, driveTitle: result.driveTitle, createdAt: result.rsvp.createdAt } }, { status: 201 })
  } catch (err) {
    if (err.message === 'NOT_FOUND') return NextResponse.json({ error: 'Drive not found.' }, { status: 404 })
    if (err.message === 'FULL') return NextResponse.json({ error: 'This drive is full.' }, { status: 400 })
    if (err.code === 'P2002') return NextResponse.json({ error: 'You have already RSVPed to this drive.' }, { status: 409 })
    throw err
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

const createSchema = z.object({
  ngo: z.string().min(1),
  amount: z.number().positive(),
  message: z.string().optional(),
})

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const pledges = await prisma.pledge.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ pledges })
}

export async function POST(request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please choose an NGO and a valid amount.' }, { status: 400 })
  }

  const pledge = await prisma.pledge.create({
    data: { userId: user.id, ...parsed.data, message: parsed.data.message || null },
  })
  return NextResponse.json({ pledge }, { status: 201 })
}

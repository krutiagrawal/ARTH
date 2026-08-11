import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

const createSchema = z.object({
  treeId: z.string().min(1),
})

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const adoptions = await prisma.adoption.findMany({
    where: { userId: user.id },
    include: { tree: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    adoptions: adoptions.map((a) => ({ id: a.id, treeId: a.treeId, treeName: a.tree.name, createdAt: a.createdAt })),
  })
}

export async function POST(request) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A tree must be selected.' }, { status: 400 })
  }

  const tree = await prisma.legacyTree.findUnique({ where: { id: parsed.data.treeId } })
  if (!tree) return NextResponse.json({ error: 'Tree not found.' }, { status: 404 })

  try {
    const adoption = await prisma.adoption.create({
      data: { userId: user.id, treeId: tree.id },
    })
    return NextResponse.json({ adoption: { id: adoption.id, treeId: tree.id, treeName: tree.name, createdAt: adoption.createdAt } }, { status: 201 })
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'You have already adopted this tree.' }, { status: 409 })
    }
    throw err
  }
}

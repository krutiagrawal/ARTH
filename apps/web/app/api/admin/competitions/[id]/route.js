import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAdmin } from '@/lib/requireApiAdmin'

export async function DELETE(request, { params }) {
  const admin = await requireApiAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const { id } = await params
  await prisma.competitionEntry.delete({ where: { id } }).catch(() => null)
  return new NextResponse(null, { status: 204 })
}

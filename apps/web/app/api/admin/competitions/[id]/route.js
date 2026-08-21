import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'

async function requireAdmin() {
  const user = await getServerUser()
  if (!user || !user.isAdmin) return null
  return user
}

export async function DELETE(request, { params }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const { id } = await params
  await prisma.competitionEntry.delete({ where: { id } }).catch(() => null)
  return new NextResponse(null, { status: 204 })
}

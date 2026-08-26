import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAdmin } from '@/lib/requireApiAdmin'

// Stats for the pure-content models apps/web still owns directly (see
// packages/db/prisma/schema.prisma's "Marketing content" section) — everything
// account/domain-related now lives behind services/api's own /api/admin/overview.
export async function GET(request) {
  const admin = await requireApiAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 })

  const [competitionEntries, newsletterSubscribers] = await Promise.all([
    prisma.competitionEntry.count(),
    prisma.newsletterSubscriber.count(),
  ])

  return NextResponse.json({ competitionEntries, newsletterSubscribers })
}

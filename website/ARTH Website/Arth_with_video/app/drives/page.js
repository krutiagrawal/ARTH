import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import DrivesClient from './DrivesClient'

export default async function Page() {
  const [user, drives] = await Promise.all([
    getServerUser(),
    prisma.drive.findMany({ orderBy: { date: 'asc' } }),
  ])
  const mine = user ? await prisma.rsvp.findMany({ where: { userId: user.id } }) : []

  const serialisedDrives = drives.map((d) => ({ ...d, date: d.date.toISOString().slice(0, 10) }))

  return <DrivesClient initialDrives={serialisedDrives} initialJoinedIds={mine.map((r) => r.driveId)} />
}

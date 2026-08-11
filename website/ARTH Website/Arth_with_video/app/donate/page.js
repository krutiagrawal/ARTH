import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import DonateClient from './DonateClient'

export default async function Page() {
  const [user, ngoPartners] = await Promise.all([
    getServerUser(),
    prisma.partner.findMany({ where: { group: 'NGOs' }, orderBy: { name: 'asc' } }),
  ])
  const mine = user
    ? await prisma.pledge.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    : []
  return <DonateClient ngoOptions={ngoPartners.map((p) => p.name)} initialPledges={mine} />
}

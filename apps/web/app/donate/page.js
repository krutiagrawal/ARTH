import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/session'
import { isStripeConfigured } from '@/lib/stripe'
import DonateClient from './DonateClient'

export const metadata = {
  title: 'Donate',
  description: 'Pledge support to a verified NGO planting real trees on the ground.',
}

export default async function Page() {
  const [user, ngoPartners] = await Promise.all([
    getServerUser(),
    prisma.partner.findMany({ where: { group: 'NGOs' }, orderBy: { name: 'asc' } }),
  ])
  const mine = user
    ? await prisma.pledge.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    : []
  return <DonateClient ngoOptions={ngoPartners.map((p) => p.name)} initialPledges={mine} stripeEnabled={isStripeConfigured()} />
}

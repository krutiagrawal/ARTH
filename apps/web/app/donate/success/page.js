import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
}

export default async function Page({ searchParams }) {
  const { pledge: pledgeId } = await searchParams
  const pledge = pledgeId ? await prisma.pledge.findUnique({ where: { id: pledgeId } }) : null

  return (
    <div className="pt-40 pb-24">
      <div className="container max-w-lg text-center">
        <p className="eyebrow text-primary">Thank you</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
          {pledge?.status === 'paid' ? 'Your donation is confirmed.' : 'Almost there.'}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {pledge?.status === 'paid'
            ? `Your ₹${pledge.amount.toLocaleString()} donation to ${pledge.ngo} has been received. It usually takes a moment for the confirmation to land — refresh the donate page if it still shows pending.`
            : "We're confirming your payment with Stripe — this can take a few seconds. Check your pledges on the donate page shortly."}
        </p>
        <Button asChild className="rounded-full mt-8"><Link href="/donate">Back to donate</Link></Button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { HeartHandshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

const STATUS_VARIANT = {
  succeeded: 'secondary',
  pending: 'outline',
  failed: 'destructive',
}

function formatAmount(cents, currency) {
  const amount = (cents ?? 0) / 100
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: (currency || 'inr').toUpperCase() }).format(amount)
  } catch {
    return `${(currency || 'inr').toUpperCase()} ${amount.toFixed(2)}`
  }
}

export default function MyDonationsClient() {
  const [data, setData] = useState(null)

  useEffect(() => {
    proxy('/campaigns/mine-donations')
      .then(setData)
      .catch((err) => toast.error(err.message || 'Could not load your donations.'))
  }, [])

  const donations = data?.donations ?? null

  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Your giving</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Donations you've made.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every contribution, tracked in one place.</p>
      </div>

      <div className="space-y-3">
        {donations === null ? (
          <>
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
          </>
        ) : donations.length === 0 ? (
          <div className="rounded-3xl border border-border/70 bg-card p-8 text-center soft-shadow">
            <HeartHandshake className="h-8 w-8 mx-auto text-primary" />
            <p className="mt-3 font-serif text-lg">No donations yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Support a campaign and it'll show up here.</p>
            <Button asChild className="mt-5 rounded-full">
              <Link href="/donate">Browse campaigns</Link>
            </Button>
          </div>
        ) : (
          donations.map((d) => (
            <div key={d.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-serif text-lg truncate">{d.campaignTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{d.ngoName || 'ARTH'} · {new Date(d.donatedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-serif text-xl">{formatAmount(d.amountCents, d.currency)}</span>
                <Badge variant={STATUS_VARIANT[d.status] || 'outline'} className="capitalize">{d.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardPageShell>
  )
}

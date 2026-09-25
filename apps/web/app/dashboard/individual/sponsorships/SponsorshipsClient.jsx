'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Sprout } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '@/lib/memberProxy'

const STATUS_VARIANT = { succeeded: 'default', pending: 'secondary', failed: 'destructive', refunded: 'outline' }

export default function SponsorshipsClient() {
  const [sponsorships, setSponsorships] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/drives/sponsorships/mine')
      .then(setSponsorships)
      .catch((err) => toast.error(err.message || 'Could not load your sponsorships.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">My Activity</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">My sponsorships</h1>
        <p className="mt-2 text-sm text-muted-foreground">Plants you've sponsored on drives.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sponsorships.length === 0 ? (
        <EmptyState icon={Sprout} title="No sponsorships yet" body="Plants you sponsor on drives will show up here." />
      ) : (
        <div className="space-y-3">
          {sponsorships.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/individual/drives/${s.driveId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 soft-shadow hover:border-primary/40 transition"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.speciesName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.driveTitle} · {s.ngoName} · {new Date(s.sponsoredAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">₹{(s.amountCents / 100).toLocaleString('en-IN')}</p>
                <Badge variant={STATUS_VARIANT[s.status] || 'outline'} className="mt-1 capitalize">{s.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

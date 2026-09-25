'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Handshake } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '../proxy'

const STATUS_VARIANT = {
  proposed: 'secondary',
  accepted: 'default',
  handed_off: 'default',
  fulfilled: 'default',
  declined: 'outline',
  withdrawn: 'outline',
}

/** Every offer this nursery has ever made to an NGO's bulk requirement, regardless of status —
 * unlike RequirementsClient, which only shows still-open requirements. */
export default function ResponsesClient() {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/nursery/bulk-requirements/responses/mine')
      .then(setResponses)
      .catch((err) => toast.error(err.message || 'Could not load your responses.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">My Activity</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">My responses</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every offer you've made to an NGO's bulk sapling requirement.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : responses.length === 0 ? (
        <EmptyState icon={Handshake} title="No responses yet" body="Offers you make to NGOs' bulk requirements will show up here." />
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.ngoName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.quantityOffered} × {r.species}
                  {r.priceCents != null ? ` · ₹${(r.priceCents / 100).toFixed(0)}` : ' · Free'} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[r.status] || 'outline'} className="shrink-0 capitalize">{r.status.replace('_', ' ')}</Badge>
            </div>
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

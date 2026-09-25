'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '@/lib/memberProxy'

function Stars({ rating }) {
  return (
    <span className="text-amber-500 text-sm">
      {'★'.repeat(rating)}
      <span className="text-muted-foreground/40">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default function ReviewsClient() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy('/orders/reviews/mine')
      .then(setReviews)
      .catch((err) => toast.error(err.message || 'Could not load your reviews.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">My Activity</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">My reviews</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reviews you've left for nurseries.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" body="Reviews you leave for nurseries will show up here." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/individual/orders/${r.orderId}`}
              className="block rounded-2xl border border-border/70 bg-card p-4 soft-shadow hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{r.nurseryName}</p>
                <Stars rating={r.nurseryRating} />
              </div>
              {r.comment && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{r.comment}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground/70">{new Date(r.createdAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

'use client'

import { Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { useTotalPagedList } from '@/hooks/useTotalPagedList'
import LoadMoreButton from '@/components/dashboard/LoadMoreButton'

const STATUS_VARIANT = { open: 'secondary', actioned: 'default', dismissed: 'outline' }
const STATUS_LABEL = { open: 'Under review', actioned: 'Actioned', dismissed: 'Dismissed' }
const TARGET_LABEL = {
  post: 'Post',
  story: 'Story',
  user: 'User',
  ngo: 'NGO',
  nursery: 'Nursery',
  corporate: 'Corporate account',
  portfolio_entry: 'Past-work entry',
  order_review: 'Review',
}
const REASON_LABEL = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  hate: 'Hate speech',
  misinformation: 'False information',
  nudity: 'Nudity or sexual content',
  violence: 'Violence or harm',
  other: 'Something else',
}

/** Reports I've filed — shared by every role's dashboard, hitting GET /api/reports/mine
 * scoped to whichever session's `proxy` is passed in. */
export default function MyReportsClient({ proxy }) {
  const { items: reports, loading, loadingMore, hasMore, loadMore } = useTotalPagedList(proxy, '/reports/mine', {}, {
    listKey: 'reports',
    take: 25,
    errorMessage: 'Could not load your reports.',
  })

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Safety</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">My reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">Content and accounts you've reported, and what came of them.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports filed" body="Content or accounts you report will show up here." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
              <div className="min-w-0">
                <p className="text-sm font-medium">{TARGET_LABEL[r.targetType] || r.targetType} reported</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {REASON_LABEL[r.reason] || r.reason} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[r.status] || 'outline'} className="shrink-0">{STATUS_LABEL[r.status] || r.status}</Badge>
            </div>
          ))}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </DashboardPageShell>
  )
}

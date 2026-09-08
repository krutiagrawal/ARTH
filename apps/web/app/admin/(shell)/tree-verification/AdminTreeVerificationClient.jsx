'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TreePine, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '@/lib/adminProxyClient'
import { resolveMediaUrl } from '@/lib/media'

const STATUS_VARIANT = { unverified: 'outline', rejected: 'destructive' }

function TreeRow({ tree, onReview }) {
  const [working, setWorking] = useState(false)

  const decide = async (decision) => {
    setWorking(true)
    try {
      await onReview(tree.id, decision)
      toast.success(decision === 'approve' ? 'Tree approved — XP awarded.' : 'Submission marked rejected.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5 flex flex-wrap items-center gap-4">
      {tree.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveMediaUrl(tree.photoUrl)} alt="" className="h-16 w-16 rounded-2xl object-cover shrink-0" />
      ) : (
        <div className="h-16 w-16 rounded-2xl bg-muted shrink-0 grid place-items-center text-2xl">{tree.species?.emoji || '🌳'}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{tree.nickname} <span className="text-muted-foreground font-normal">· {tree.species?.commonName}</span></p>
        <p className="text-xs text-muted-foreground mt-0.5">Planted by {tree.user?.name} (@{tree.user?.handle})</p>
        <p className="text-xs text-muted-foreground">{new Date(tree.createdAt ?? tree.plantedAt).toLocaleString()}</p>
      </div>
      <Badge variant={STATUS_VARIANT[tree.aiVerificationStatus] || 'outline'} className="capitalize">{tree.aiVerificationStatus}</Badge>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full" onClick={() => decide('approve')} disabled={working}>
          <Check className="h-4 w-4" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => decide('reject')} disabled={working}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>
    </div>
  )
}

export default function AdminTreeVerificationClient() {
  const [trees, setTrees] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy('/admin/trees/review-queue')
      setTrees(data.trees)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleReview = async (id, decision) => {
    await proxy(`/admin/trees/${id}/review`, { method: 'PATCH', body: { decision } })
    await load()
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Trust &amp; safety</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Tree photo verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submissions the AI flagged or couldn&rsquo;t verify. Rejected trees earn no XP until approved here.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : trees.length === 0 ? (
        <EmptyState icon={TreePine} title="Queue is empty" body="No submissions waiting for review." />
      ) : (
        <div className="space-y-3">
          {trees.map((tree) => (
            <TreeRow key={tree.id} tree={tree} onReview={handleReview} />
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

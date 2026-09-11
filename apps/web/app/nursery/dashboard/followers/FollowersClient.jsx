'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users, TreePine, Check, X, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '../proxy'

const TABS = [
  { value: 'accepted', label: 'Followers' },
  { value: 'pending', label: 'Requests' },
]

export default function FollowersClient() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('accepted')
  const [removeTarget, setRemoveTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await proxy(`/nursery/followers?status=${tab}`))
    } catch (err) {
      toast.error(err.message || 'Could not load followers.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const act = async (followId, action) => {
    try {
      await proxy(`/nursery/followers/${followId}/${action}`, { method: 'POST' })
      toast.success(action === 'accept' ? 'Accepted.' : 'Declined.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    try {
      await proxy(`/nursery/followers/${removeTarget.followId}`, { method: 'DELETE' })
      toast.success('Removed.')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setRemoveTarget(null)
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Followers</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Your community</h1>
        </div>
        {data && <Badge variant="secondary">{data.pendingCount} pending request{data.pendingCount === 1 ? '' : 's'}</Badge>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data?.followers?.length ? (
        <EmptyState icon={Users} title={tab === 'pending' ? 'No pending requests' : 'No followers yet'} body="People who follow your nursery will show up here." />
      ) : (
        <div className="max-w-2xl divide-y divide-border/60 rounded-3xl border border-border/70 bg-card soft-shadow">
          {data.followers.map((f) => (
            <div key={f.followId} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{f.user.avatarEmoji || '🙂'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{f.user.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    @{f.user.handle} · <TreePine className="h-3 w-3" /> {f.user.treesPlantedCount ?? 0}
                  </p>
                </div>
              </div>
              {tab === 'pending' ? (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => act(f.followId, 'accept')}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={() => act(f.followId, 'decline')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full shrink-0" onClick={() => setRemoveTarget(f)}>
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this follower?"
        description="They'll stop following your nursery and can re-follow later."
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </DashboardPageShell>
  )
}

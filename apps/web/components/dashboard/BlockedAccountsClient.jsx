'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ShieldOff, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { resolveMediaUrl } from '@/lib/media'

/** Accounts I've blocked — shared by every role's dashboard (they all hit the same
 * GET/DELETE /api/blocks, scoped to whichever session's `proxy` is passed in). */
export default function BlockedAccountsClient({ proxy }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [unblockTarget, setUnblockTarget] = useState(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setBlocks(await proxy('/blocks'))
    } catch (err) {
      toast.error(err.message || 'Could not load blocked accounts.')
    } finally {
      setLoading(false)
    }
  }, [proxy])

  useEffect(() => {
    load()
  }, [load])

  const handleUnblock = async () => {
    if (!unblockTarget) return
    setWorking(true)
    try {
      const body = unblockTarget.kind === 'ngo' ? { ngoId: unblockTarget.targetId } : { userId: unblockTarget.targetId }
      await proxy('/blocks', { method: 'DELETE', body })
      toast.success('Unblocked.')
      setUnblockTarget(null)
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Safety</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Blocked accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">People and organizations you've hidden from your feed and their content.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : blocks.length === 0 ? (
        <EmptyState icon={ShieldOff} title="No blocked accounts" body="Accounts you block will show up here." />
      ) : (
        <div className="space-y-3">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(b.logoUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-serif">{b.name?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{b.name}</p>
                {b.handle && <p className="text-xs text-muted-foreground">@{b.handle}</p>}
              </div>
              <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={() => setUnblockTarget(b)}>
                <Ban className="h-3.5 w-3.5" /> Unblock
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(unblockTarget)}
        onOpenChange={(open) => !open && setUnblockTarget(null)}
        title={`Unblock ${unblockTarget?.name ?? 'this account'}?`}
        description="You'll see their content again and they'll be able to interact with you."
        confirmLabel="Unblock"
        loading={working}
        onConfirm={handleUnblock}
      />
    </DashboardPageShell>
  )
}

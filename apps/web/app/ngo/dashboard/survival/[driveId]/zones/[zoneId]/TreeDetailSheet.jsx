'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { resolveMediaUrl } from '@/lib/media'
import { proxy } from '../../../../proxy'
import { STATUS_LABELS, STATUS_VARIANT } from '../../../survivalFormat'

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'struggling', label: 'Struggling' },
  { value: 'dead', label: 'Dead' },
  { value: 'removed', label: 'Removed' },
]

export default function TreeDetailSheet({ treeId, open, onOpenChange, onChanged, guard }) {
  const [tree, setTree] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!open || !treeId) return
    setLoading(true)
    Promise.all([proxy(`/ngo/planted-trees/${treeId}`), proxy(`/ngo/planted-trees/${treeId}/health-checks`)])
      .then(([treeRes, historyRes]) => {
        setTree(treeRes)
        setHistory(historyRes.checks)
      })
      .catch((err) => toast.error(err.message || 'Could not load this tree.'))
      .finally(() => setLoading(false))
  }, [open, treeId])

  const applyStatus = async (status) => {
    setApplying(true)
    try {
      const form = new FormData()
      form.append('status', status)
      await proxy(`/ngo/planted-trees/${treeId}/health-checks`, { method: 'POST', body: form })
      toast.success(`Marked as ${STATUS_LABELS[status]}.`)
      const [treeRes, historyRes] = await Promise.all([proxy(`/ngo/planted-trees/${treeId}`), proxy(`/ngo/planted-trees/${treeId}/health-checks`)])
      setTree(treeRes)
      setHistory(historyRes.checks)
      onChanged?.()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <SheetTitle className="text-base">{tree?.speciesName || (loading ? 'Loading…' : 'Tree')}</SheetTitle>
          <SheetDescription className="text-xs">{tree?.zoneName ? `${tree.zoneName} · ` : ''}{tree?.driveTitle || 'No plantation'}</SheetDescription>
        </div>

        <div className="modern-scrollbar flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {tree?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(tree.photoUrl)} alt={tree.speciesName} className="w-full rounded-xl object-cover max-h-56" />
          )}

          {tree && (
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={STATUS_VARIANT[tree.latestStatus]} className="capitalize">{STATUS_LABELS[tree.latestStatus]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Planted</span>
                <span>{new Date(tree.plantedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {tree.locationLabel && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-right">{tree.locationLabel}</span>
                </div>
              )}
              {tree.lat != null && tree.lng != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">GPS</span>
                  <span>{tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Mark this tree as</p>
            <div className="flex flex-wrap gap-2">
              {HEALTH_OPTIONS.map((opt) => (
                <Button key={opt.value} size="sm" variant="outline" className="rounded-full" disabled={applying} onClick={guard(() => applyStatus(opt.value))}>
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Health-check history</p>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No health checks logged yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((check) => (
                  <li key={check.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                    <Badge variant={STATUS_VARIANT[check.status]} className="capitalize">{STATUS_LABELS[check.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(check.checkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

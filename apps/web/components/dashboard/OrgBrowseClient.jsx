'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Flag, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ReportDialog from '@/components/dashboard/ReportDialog'
import { resolveMediaUrl } from '@/lib/media'

/**
 * Browse other NGOs/nurseries and follow/report them — shared by every org-role dashboard
 * (NGO, Nursery, Group) that has no other way to discover and follow other orgs today.
 * Takes that role's own session `proxy` so the follow/report actions post as that role's
 * account, not the individual/member session (see ReportDialog's own `proxy` prop for why).
 */
export default function OrgBrowseClient({ proxy }) {
  const [tab, setTab] = useState('ngos')
  const [query, setQuery] = useState('')
  const [ngos, setNgos] = useState([])
  const [nurseries, setNurseries] = useState([])
  const [followedNgoIds, setFollowedNgoIds] = useState(new Set())
  const [followedNurseryIds, setFollowedNurseryIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [reportTarget, setReportTarget] = useState(null) // { targetType, targetId, targetLabel }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = query ? `?q=${encodeURIComponent(query)}` : ''
      const [ngoRes, nurseryRes, followedNgos, followedNurseries] = await Promise.all([
        proxy(`/ngos${qs}`),
        proxy(`/nurseries${qs}`),
        proxy('/follows'),
        proxy('/follows/nurseries'),
      ])
      setNgos(ngoRes.ngos || [])
      setNurseries(nurseryRes.nurseries || [])
      setFollowedNgoIds(new Set((followedNgos || []).map((n) => n.id)))
      setFollowedNurseryIds(new Set((followedNurseries || []).map((n) => n.id)))
    } catch (err) {
      toast.error(err.message || 'Could not load organizations.')
    } finally {
      setLoading(false)
    }
  }, [proxy, query])

  useEffect(() => {
    load()
  }, [load])

  const toggleFollowNgo = async (id, following) => {
    setBusyId(id)
    try {
      await proxy(`/ngos/${id}/follow`, { method: following ? 'DELETE' : 'POST' })
      setFollowedNgoIds((prev) => {
        const next = new Set(prev)
        if (following) next.delete(id)
        else next.add(id)
        return next
      })
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  const toggleFollowNursery = async (id, following) => {
    setBusyId(id)
    try {
      await proxy(`/nurseries/${id}/follow`, { method: following ? 'DELETE' : 'POST' })
      setFollowedNurseryIds((prev) => {
        const next = new Set(prev)
        if (following) next.delete(id)
        else next.add(id)
        return next
      })
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  const rows = useMemo(() => (tab === 'ngos' ? ngos : nurseries), [tab, ngos, nurseries])

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Browse</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">NGOs &amp; nurseries</h1>
        <p className="mt-2 text-sm text-muted-foreground">Find and follow other organizations on ARTH.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ngos">NGOs</TabsTrigger>
            <TabsTrigger value="nurseries">Nurseries</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or city…" className="pl-9 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Nothing found" body="Try a different search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => {
            const isNgo = tab === 'ngos'
            const following = isNgo ? followedNgoIds.has(row.id) : followedNurseryIds.has(row.id)
            const name = isNgo ? row.orgName : row.nurseryName
            return (
              <div key={row.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {row.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(row.logoUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-serif">{name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.city || '—'}</p>
                  </div>
                </div>
                {row.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{row.description}</p>}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant={following ? 'outline' : 'default'}
                    className="rounded-full"
                    disabled={busyId === row.id}
                    onClick={() => (isNgo ? toggleFollowNgo(row.id, following) : toggleFollowNursery(row.id, following))}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setReportTarget({ targetType: isNgo ? 'ngo' : 'nursery', targetId: row.id, targetLabel: name })}
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReportDialog
        open={Boolean(reportTarget)}
        onOpenChange={(open) => !open && setReportTarget(null)}
        targetType={reportTarget?.targetType}
        targetId={reportTarget?.targetId}
        targetLabel={reportTarget?.targetLabel}
        proxy={proxy}
      />
    </DashboardPageShell>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ShieldBan, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { proxy } from '@/lib/adminProxyClient'
import { resolveMediaUrl } from '@/lib/media'

const APPROVAL_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }

const CONFIRM_COPY = {
  approve: { title: 'Approve this account?', confirmLabel: 'Approve', body: 'They can immediately start publishing.', status: 'approved' },
  reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected', destructive: true },
  suspend: {
    title: 'Suspend this account?',
    confirmLabel: 'Suspend',
    body: "They keep read access but can't publish anything new until reinstated.",
    status: 'suspended',
    destructive: true,
  },
  reinstate: { title: 'Reinstate this account?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
  block: {
    title: 'Block this account?',
    confirmLabel: 'Block',
    body: 'They immediately lose access on web and mobile — every signed-in request will be rejected until unblocked.',
    destructive: true,
  },
  unblock: { title: 'Unblock this account?', confirmLabel: 'Unblock', body: 'They regain full access on web and mobile immediately.' },
}

function money(cents) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((cents ?? 0) / 100)
}

function MediaCard({ caption, media, meta }) {
  const url = resolveMediaUrl(media?.[0]?.url)
  return (
    <div className="rounded-2xl border border-border/70 bg-card soft-shadow overflow-hidden">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="p-3">
        {caption && <p className="text-sm line-clamp-2">{caption}</p>}
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
      </div>
    </div>
  )
}

export default function AdminAccountProfileClient({ userId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await proxy(`/admin/accounts/${userId}/profile`))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const account = data?.account
  const kind = data?.kind
  const content = data?.content

  const orgProfile = account?.ngoProfile ?? account?.nurseryProfile ?? account?.corporateProfile ?? null
  const orgName = account?.ngoProfile?.orgName ?? account?.nurseryProfile?.nurseryName ?? account?.corporateProfile?.companyName ?? null
  const approvalStatus = orgProfile?.status ?? null

  const statusEndpoint =
    kind === 'ngo'
      ? `/admin/ngos/${orgProfile?.id}/status`
      : kind === 'nursery'
        ? `/admin/nurseries/${orgProfile?.id}/status`
        : kind === 'corporate'
          ? `/admin/corporates/${orgProfile?.id}/status`
          : null

  const runConfirm = async () => {
    if (!confirm) return
    setWorking(true)
    try {
      if (confirm === 'block' || confirm === 'unblock') {
        await proxy(`/admin/accounts/${userId}/${confirm}`, {
          method: 'POST',
          body: confirm === 'block' ? { reason: reason || undefined } : undefined,
        })
      } else {
        await proxy(statusEndpoint, { method: 'PATCH', body: { status: CONFIRM_COPY[confirm].status, rejectionReason: reason || undefined } })
      }
      toast.success('Updated.')
      setConfirm(null)
      setReason('')
      await load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return (
      <DashboardPageShell className="space-y-6">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  if (!data) {
    return (
      <DashboardPageShell className="space-y-6">
        <EmptyState title="Account not found" body="It may have been deleted." />
      </DashboardPageShell>
    )
  }

  const logoUrl = resolveMediaUrl(content?.logoUrl ?? null)
  const needsReason = confirm === 'reject' || confirm === 'suspend' || confirm === 'block'

  return (
    <DashboardPageShell className="space-y-6">
      <button onClick={() => router.push('/admin/accounts')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Accounts
      </button>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center font-serif text-2xl text-muted-foreground">
                {(orgName || account.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl">{orgName || account.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                @{account.handle} · {account.email}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="capitalize">{account.role}</Badge>
                {approvalStatus && <Badge variant={APPROVAL_VARIANT[approvalStatus]} className="capitalize">{approvalStatus}</Badge>}
                {account.isBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="secondary">Active</Badge>}
              </div>
              {account.isBlocked && account.blockedReason && (
                <p className="text-sm text-muted-foreground mt-2">Block reason: &ldquo;{account.blockedReason}&rdquo;</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {approvalStatus === 'pending' && (
              <>
                <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                  <ShieldCheck className="h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                  <ShieldX className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {approvalStatus === 'approved' && (
              <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                <ShieldAlert className="h-4 w-4" /> Suspend
              </Button>
            )}
            {approvalStatus === 'suspended' && (
              <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                <ShieldQuestion className="h-4 w-4" /> Reinstate
              </Button>
            )}
            {approvalStatus === 'rejected' && (
              <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                <ShieldCheck className="h-4 w-4" /> Approve
              </Button>
            )}
            {account.isBlocked ? (
              <Button className="rounded-full" onClick={() => setConfirm('unblock')}>
                <ShieldCheck className="h-4 w-4" /> Unblock
              </Button>
            ) : (
              <Button variant="destructive" className="rounded-full" onClick={() => setConfirm('block')}>
                <ShieldBan className="h-4 w-4" /> Block
              </Button>
            )}
          </div>
        </div>
      </div>

      {kind === 'ngo' && (
        <>
          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6 space-y-3">
            <p className="eyebrow">About</p>
            <p className="text-sm text-muted-foreground">{content.description}</p>
            {content.website && (
              <a href={content.website} target="_blank" rel="noreferrer" className="text-sm text-primary underline block">
                {content.website}
              </a>
            )}
            {content.city && <p className="text-sm text-muted-foreground">{content.city}</p>}
          </div>

          {content.recentUpdates?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Updates</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.recentUpdates.map((post) => (
                  <MediaCard key={post.id} caption={post.caption} media={post.media} meta={new Date(post.createdAt).toLocaleDateString()} />
                ))}
              </div>
            </section>
          )}

          {content.featuredDrives?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Drives</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.featuredDrives.map((d) => (
                  <MediaCard key={d.id} caption={d.title} media={d.photoUrl ? [{ url: d.photoUrl }] : []} meta={d.city} />
                ))}
              </div>
            </section>
          )}

          {content.portfolio?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Portfolio</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.portfolio.map((p) => (
                  <MediaCard key={p.id} caption={p.title ?? p.description} media={p.media} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {kind === 'nursery' && (
        <>
          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6 space-y-3">
            <p className="eyebrow">About</p>
            <p className="text-sm text-muted-foreground">{content.description}</p>
            {content.contactPhone && <p className="text-sm text-muted-foreground">{content.contactPhone}</p>}
            {content.city && <p className="text-sm text-muted-foreground">{content.city}</p>}
          </div>

          {content.recentPosts?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Updates</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.recentPosts.map((post) => (
                  <MediaCard key={post.id} caption={post.caption} media={post.media} meta={new Date(post.createdAt).toLocaleDateString()} />
                ))}
              </div>
            </section>
          )}

          {content.stock?.length > 0 && (
            <section className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
              <p className="eyebrow p-6 pb-0">Stock</p>
              <div className="p-6 pt-3 space-y-2">
                {content.stock.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                    <span>{s.species}</span>
                    <span className="text-muted-foreground">
                      {s.quantity} in stock · {s.isFree ? 'Free' : s.priceCents != null ? money(s.priceCents) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {kind === 'corporate' && (
        <>
          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6 space-y-3">
            <p className="eyebrow">About</p>
            <p className="text-sm text-muted-foreground">{content.description}</p>
            {content.industry && <p className="text-sm text-muted-foreground">{content.industry}</p>}
            {content.city && <p className="text-sm text-muted-foreground">{content.city}</p>}
          </div>

          <section className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
            <p className="eyebrow p-6 pb-0">CSR sponsorships</p>
            {content.sponsorships?.length > 0 ? (
              <div className="p-6 pt-3 space-y-2">
                {content.sponsorships.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                    <span>{s.drive?.title ?? 'General sponsorship'}{s.note ? ` — ${s.note}` : ''}</span>
                    <span className="text-muted-foreground">
                      {money(s.amountCents)} · {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState title="No sponsorships yet" body="This corporate account hasn't sponsored any drives." />
              </div>
            )}
          </section>
        </>
      )}

      {kind === 'user' && (
        <>
          {content.posts?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Posts</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.posts.map((post) => (
                  <MediaCard key={post.id} caption={post.caption} media={post.media} meta={new Date(post.createdAt).toLocaleDateString()} />
                ))}
              </div>
            </section>
          )}

          {content.trees?.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Trees planted</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {content.trees.map((tree) => (
                  <MediaCard
                    key={tree.id}
                    caption={`${tree.nickname} · ${tree.species?.commonName ?? ''}`}
                    media={tree.photoUrl ? [{ url: tree.photoUrl }] : []}
                    meta={`${tree.aiVerificationStatus} · ${new Date(tree.plantedAt).toLocaleDateString()}`}
                  />
                ))}
              </div>
            </section>
          )}

          {!content.posts?.length && !content.trees?.length && (
            <EmptyState title="No activity yet" body="This account hasn't posted or planted any trees." />
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? CONFIRM_COPY[confirm].title : ''}
        description={confirm ? CONFIRM_COPY[confirm].body : ''}
        confirmLabel={confirm ? CONFIRM_COPY[confirm].confirmLabel : ''}
        destructive={confirm ? Boolean(CONFIRM_COPY[confirm].destructive) : false}
        loading={working}
        onConfirm={runConfirm}
      >
        {needsReason && (
          <label className="block">
            <span className="eyebrow">Reason {confirm === 'block' ? '(kept on file, not shown to the account)' : '(shown to the account)'}</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </DashboardPageShell>
  )
}

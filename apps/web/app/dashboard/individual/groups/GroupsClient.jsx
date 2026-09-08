'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, GraduationCap, Home, PartyPopper, Sprout, Ticket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'
import { resolveMediaUrl } from '@/lib/media'

const ROLE_LABEL = { owner: 'Owner', co_admin: 'Co-admin', member: 'Member' }

const TYPE_STYLE = {
  family: { icon: Home, className: 'bg-primary/20 text-primary' },
  school: { icon: GraduationCap, className: 'bg-sand/30 text-accent' },
  club: { icon: PartyPopper, className: 'bg-primary/20 text-primary' },
  other: { icon: Sprout, className: 'bg-sand/30 text-accent' },
}

function GroupAvatar({ group, size = 'h-14 w-14' }) {
  const { icon: Icon, className } = TYPE_STYLE[group.groupType] || TYPE_STYLE.other
  if (group.logoUrl) {
    return (
      <div className={`${size} shrink-0 rounded-2xl overflow-hidden bg-secondary`}>
        <img src={resolveMediaUrl(group.logoUrl)} alt={group.groupName} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`${size} shrink-0 grid place-items-center rounded-2xl ${className}`}>
      <Icon className="h-6 w-6" />
    </div>
  )
}

function EmptyGroupsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
      <circle cx="60" cy="60" r="58" fill="hsl(106 22% 69% / 0.12)" />
      <circle cx="42" cy="52" r="12" fill="hsl(106 22% 60%)" />
      <circle cx="78" cy="52" r="12" fill="hsl(38 48% 68%)" />
      <circle cx="60" cy="40" r="13" fill="hsl(106 22% 45%)" />
      <path d="M28 88c2-14 12-22 32-22s30 8 32 22" stroke="hsl(106 22% 45%)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="92" rx="34" ry="4" fill="hsl(106 22% 45% / 0.12)" />
    </svg>
  )
}

export default function GroupsClient() {
  const [memberships, setMemberships] = useState(null)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

  const load = () => {
    proxy('/groups/mine')
      .then(setMemberships)
      .catch((err) => toast.error(err.message || 'Could not load your groups.'))
  }

  useEffect(load, [])

  const join = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setJoining(true)
    try {
      await proxy('/groups/join', { method: 'POST', body: { inviteCode: inviteCode.trim() } })
      toast.success('Joined the group!')
      setInviteCode('')
      load()
    } catch (err) {
      toast.error(err.message || 'Could not join with that code.')
    } finally {
      setJoining(false)
    }
  }

  const leave = async (groupId) => {
    try {
      await proxy(`/groups/${groupId}/leave`, { method: 'POST' })
      toast.success('Left the group.')
      load()
    } catch (err) {
      toast.error(err.message || 'Could not leave this group.')
    }
  }

  return (
    <DashboardPageShell>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-primary">Groups</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Plant with your people.</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">Join a family, school, or club group with an invite code.</p>
        </div>
        <form onSubmit={join} className="flex items-center gap-2 rounded-full border border-border bg-card pl-5 pr-1.5 py-1.5 soft-shadow shrink-0">
          <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite code"
            className="h-9 w-40 rounded-full border-none shadow-none focus-visible:ring-0 px-1"
          />
          <Button type="submit" disabled={joining} size="sm" className="rounded-full shrink-0">
            {joining ? 'Joining…' : 'Join'}
          </Button>
        </form>
      </div>

      <div>
        <p className="eyebrow mb-4">{memberships?.length ? `${memberships.length} group${memberships.length === 1 ? '' : 's'}` : 'Your groups'}</p>
        {memberships === null ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
        ) : memberships.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
            <EmptyGroupsIllustration />
            <p className="mt-4 text-sm text-muted-foreground">You haven&rsquo;t joined a group yet — ask for an invite code and join above.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {memberships.map((m) => (
              <div key={m.group.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow transition hover:border-primary/40">
                <div className="flex items-start gap-4">
                  <GroupAvatar group={m.group} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg truncate">{m.group.groupName}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                      <span className="text-xs text-muted-foreground">{m.group.city || 'No city set'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 pt-4 border-t border-border/60">
                  <Link href={`/dashboard/individual/groups/${m.group.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Challenges <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {m.role !== 'owner' && (
                    <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => leave(m.group.id)}>
                      Leave
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../../proxy'

const ROLE_LABEL = { owner: 'Owner', co_admin: 'Co-admin', member: 'Member' }

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
    <div className="max-w-3xl">
      <p className="eyebrow text-primary">Groups</p>
      <h1 className="font-serif text-3xl md:text-4xl mt-2">Plant with your people.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Join a family, school, or club group with an invite code.</p>

      <form onSubmit={join} className="mt-6 flex gap-2 max-w-sm">
        <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Invite code" className="h-11 rounded-full" />
        <Button type="submit" disabled={joining} className="rounded-full shrink-0">
          {joining ? 'Joining…' : 'Join'}
        </Button>
      </form>

      <div className="mt-8 space-y-3">
        {memberships === null ? (
          <>
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
          </>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't joined a group yet.</p>
        ) : (
          memberships.map((m) => (
            <div key={m.group.id} className="rounded-3xl border border-border/70 bg-card p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg">{m.group.groupName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ROLE_LABEL[m.role]} · {m.group.city || 'No city set'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/app/groups/${m.group.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Challenges <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {m.role !== 'owner' && (
                  <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => leave(m.group.id)}>
                    Leave
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

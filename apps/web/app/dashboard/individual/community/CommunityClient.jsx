'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Search, UserPlus, Check, X, Flame, TreePine, Newspaper } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

function EmojiAvatar({ emoji, size = 'h-11 w-11', online = false, text = 'text-lg' }) {
  return (
    <span className="relative shrink-0">
      <span className={`${size} grid place-items-center rounded-full bg-primary/15 ${text}`}>{emoji || '🌱'}</span>
      {online && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />}
    </span>
  )
}

function EmptyStateIllustration({ variant }) {
  if (variant === 'following') {
    return (
      <svg width="110" height="110" viewBox="0 0 120 120" fill="none" className="mx-auto">
        <circle cx="60" cy="60" r="58" fill="hsl(106 22% 69% / 0.12)" />
        <rect x="34" y="40" width="52" height="40" rx="8" fill="hsl(106 22% 60%)" />
        <rect x="34" y="40" width="52" height="12" rx="8" fill="hsl(106 22% 45%)" />
        <circle cx="46" cy="68" r="4" fill="hsl(42 40% 95%)" />
        <rect x="56" y="65" width="24" height="3" rx="1.5" fill="hsl(42 40% 95%)" />
        <rect x="56" y="71" width="18" height="3" rx="1.5" fill="hsl(42 40% 95% / 0.7)" />
      </svg>
    )
  }
  return (
    <svg width="110" height="110" viewBox="0 0 120 120" fill="none" className="mx-auto">
      <circle cx="60" cy="60" r="58" fill="hsl(38 48% 68% / 0.18)" />
      <circle cx="46" cy="55" r="16" fill="hsl(106 22% 60%)" />
      <circle cx="76" cy="58" r="13" fill="hsl(38 48% 55%)" />
      <path d="M30 92c1.5-12 8-19 18-19s16.5 7 18 19" stroke="hsl(106 22% 45%)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M62 92c1.2-9 6-14 15-14" stroke="hsl(38 48% 45%)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function FollowingPanel() {
  const [ngos, setNgos] = useState(null)
  const [feed, setFeed] = useState(null)

  useEffect(() => {
    proxy('/follows')
      .then(setNgos)
      .catch((err) => toast.error(err.message || 'Could not load followed NGOs.'))
    proxy('/follows/feed')
      .then((res) => setFeed(res.updates))
      .catch((err) => toast.error(err.message || 'Could not load your feed.'))
  }, [])

  if (ngos !== null && ngos.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
        <EmptyStateIllustration variant="following" />
        <p className="mt-4 text-sm text-muted-foreground">
          You&rsquo;re not following any NGOs yet. <Link href="/ngos" className="text-primary underline">Browse NGOs</Link> to follow one.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-3">{ngos === null ? 'NGOs you follow' : `${ngos.length} NGO${ngos.length === 1 ? '' : 's'} you follow`}</p>
        {ngos === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ngos.map((n) => (
              <Link
                key={n.id}
                href={`/ngos/${n.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 transition hover:border-primary/40"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-secondary">
                  {n.logoUrl ? (
                    <img src={n.logoUrl} alt={n.orgName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-primary">
                      <Newspaper className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{n.orgName}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.city || 'Location not set'}</p>
                </div>
                {n.followStatus === 'pending' && <Badge variant="outline" className="ml-auto shrink-0">Pending</Badge>}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="eyebrow mb-3">Recent updates</p>
        <div className="space-y-4">
          {feed === null ? (
            <>
              <Skeleton className="h-28 w-full rounded-3xl" />
              <Skeleton className="h-28 w-full rounded-3xl" />
            </>
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet from the NGOs you follow.</p>
          ) : (
            feed.map((u) => (
              <div key={u.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex gap-4">
                {u.photoUrl ? (
                  <img src={u.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="h-20 w-20 shrink-0 rounded-2xl bg-primary/10 grid place-items-center text-primary">
                    <Newspaper className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <Link href={`/ngos/${u.ngoId}`} className="text-sm font-medium text-primary hover:underline">
                    {u.ngoName}
                  </Link>
                  {u.driveTitle && <p className="text-xs text-muted-foreground mt-0.5">{u.driveTitle}</p>}
                  <p className="text-sm mt-1.5">{u.caption}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(u.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function FriendsPanel() {
  const [friends, setFriends] = useState(null)
  const [requests, setRequests] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    proxy('/friends').then(setFriends).catch((err) => toast.error(err.message || 'Could not load your friends.'))
    proxy('/friends/requests').then(setRequests).catch((err) => toast.error(err.message || 'Could not load friend requests.'))
  }

  useEffect(load, [])

  const search = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    try {
      const users = await proxy(`/users/search?q=${encodeURIComponent(q)}`)
      setResults(users)
    } catch (err) {
      toast.error(err.message || 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const sendRequest = async (userId) => {
    setBusyId(userId)
    try {
      await proxy('/friends/requests', { method: 'POST', body: { addresseeId: userId } })
      toast.success('Friend request sent.')
      setResults((prev) => prev?.filter((u) => u.id !== userId) ?? null)
    } catch (err) {
      toast.error(err.message || 'Could not send friend request.')
    } finally {
      setBusyId(null)
    }
  }

  const respond = async (requestId, action) => {
    setBusyId(requestId)
    try {
      await proxy(`/friends/requests/${requestId}/${action}`, { method: 'POST' })
      toast.success(action === 'accept' ? 'Friend request accepted.' : 'Request declined.')
      load()
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setBusyId(null)
    }
  }

  const removeFriend = async (friendUserId) => {
    setBusyId(friendUserId)
    try {
      await proxy(`/friends/${friendUserId}`, { method: 'DELETE' })
      toast.success('Removed from friends.')
      load()
    } catch (err) {
      toast.error(err.message || 'Could not remove this friend.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={search} className="flex items-center gap-2 rounded-full border border-border bg-card pl-5 pr-1.5 py-1.5 soft-shadow max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or handle"
          className="h-9 rounded-full border-none shadow-none focus-visible:ring-0 px-1"
        />
        <Button type="submit" disabled={searching} className="rounded-full shrink-0" size="sm">
          {searching ? '…' : 'Search'}
        </Button>
      </form>

      {results !== null && (
        <div>
          <p className="eyebrow mb-3">Search results</p>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one matched that search.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <EmojiAvatar emoji={u.avatarEmoji} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.handle} · Level {u.level}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full shrink-0" disabled={busyId === u.id} onClick={() => sendRequest(u.id)}>
                    <UserPlus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {requests !== null && requests.length > 0 && (
        <div>
          <p className="eyebrow mb-3">Friend requests</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <EmojiAvatar emoji={r.from.avatar} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.from.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{r.from.handle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" className="rounded-full" disabled={busyId === r.id} onClick={() => respond(r.id, 'accept')}>
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full text-muted-foreground" disabled={busyId === r.id} onClick={() => respond(r.id, 'decline')}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-3">{friends?.length ? `${friends.length} friend${friends.length === 1 ? '' : 's'}` : 'Your friends'}</p>
        {friends === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
            <EmptyStateIllustration variant="friends" />
            <p className="mt-4 text-sm text-muted-foreground">No friends yet — search above to add someone.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {friends.map((f) => (
              <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <EmojiAvatar emoji={f.avatar} online={f.isOnline} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{f.handle}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="gap-1"><TreePine className="h-3 w-3" /> {f.treesPlanted}</Badge>
                      <Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3" /> {f.streak}</Badge>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground shrink-0" disabled={busyId === f.id} onClick={() => removeFriend(f.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CommunityClient() {
  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Community</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">People and NGOs you&rsquo;re connected to.</h1>
      </div>

      <Tabs defaultValue="following">
        <TabsList className="h-10 rounded-full bg-secondary p-1">
          <TabsTrigger value="following" className="rounded-full px-4">Following</TabsTrigger>
          <TabsTrigger value="friends" className="rounded-full px-4">Friends</TabsTrigger>
        </TabsList>
        <TabsContent value="following" className="mt-6">
          <FollowingPanel />
        </TabsContent>
        <TabsContent value="friends" className="mt-6">
          <FriendsPanel />
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  )
}

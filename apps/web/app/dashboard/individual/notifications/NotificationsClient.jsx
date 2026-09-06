'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Bell,
  UserPlus,
  Heart,
  Newspaper,
  CalendarDays,
  ShieldAlert,
  Sprout,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RefreshCcw,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'
import { cn } from '@/lib/utils'

const TYPE_META = {
  follow_request: { icon: UserPlus, text: (n) => `${actorName(n)} requested to follow you.` },
  follow_accepted: { icon: UserPlus, text: (n) => `${actorName(n)} accepted your follow request.` },
  new_follower: { icon: UserPlus, text: (n) => `${actorName(n)} started following you.` },
  post_like: { icon: Heart, text: (n) => `${actorName(n)} liked your post.` },
  new_post_from_followed: { icon: Newspaper, text: (n) => `${actorName(n)} shared a new update.` },
  drive_reminder: { icon: CalendarDays, text: () => 'A drive you joined is coming up.' },
  report_resolved: { icon: ShieldAlert, text: () => 'Your report was resolved.' },
  moderation_action: { icon: ShieldAlert, text: () => 'A moderation action affected your account.' },
  reservation_requested: { icon: Sprout, text: () => 'A sapling reservation was requested.' },
  reservation_fulfilled: { icon: CheckCircle2, text: () => 'Your reservation was fulfilled.' },
  reservation_declined: { icon: XCircle, text: () => 'Your reservation was declined.' },
  order_placed: { icon: Package, text: () => 'Your order was placed.' },
  order_confirmed: { icon: CheckCircle2, text: () => 'Your order was confirmed.' },
  order_out_for_delivery: { icon: Truck, text: () => 'Your order is out for delivery.' },
  order_delivered: { icon: CheckCircle2, text: () => 'Your order was delivered.' },
  order_cancelled: { icon: XCircle, text: () => 'Your order was cancelled.' },
  wishlist_back_in_stock: { icon: RefreshCcw, text: () => 'Something on your wishlist is back in stock.' },
}

function actorName(n) {
  return n.actor?.name || n.actor?.handle || 'Someone'
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = () =>
    proxy('/notifications')
      .then((res) => {
        setNotifications(res.notifications)
        setCursor(res.nextCursor)
      })
      .catch((err) => toast.error(err.message || 'Could not load notifications.'))

  useEffect(() => { load() }, [])

  const loadMore = async () => {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const res = await proxy(`/notifications?cursor=${cursor}`)
      setNotifications((prev) => [...prev, ...res.notifications])
      setCursor(res.nextCursor)
    } catch (err) {
      toast.error(err.message || 'Could not load more.')
    } finally {
      setLoadingMore(false)
    }
  }

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await proxy('/notifications/read', { method: 'POST', body: { ids: [id] } })
    } catch {
      // best-effort — local state already flipped
    }
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await proxy('/notifications/read', { method: 'POST', body: {} })
      toast.success('All caught up.')
    } catch (err) {
      toast.error(err.message || 'Could not mark all as read.')
    }
  }

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <DashboardPageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="eyebrow text-primary">Inbox</p>
            <h1 className="font-serif text-3xl">Notifications</h1>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
          <p className="text-sm text-muted-foreground">You&rsquo;re all caught up — nothing here yet.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
          <ul className="divide-y divide-border/60">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] || { icon: Bell, text: () => 'You have a new notification.' }
              const Icon = meta.icon
              return (
                <li key={n.id}>
                  <button
                    onClick={() => !n.read && markRead(n.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/60',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm">{meta.text(n)}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </span>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              )
            })}
          </ul>
          {cursor && (
            <div className="p-4 border-t border-border/60 text-center">
              <Button size="sm" variant="outline" className="rounded-full" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardPageShell>
  )
}

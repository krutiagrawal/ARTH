'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronRight, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'
import { cn } from '@/lib/utils'

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

const STATUS_LABEL = {
  pending_payment: 'Payment pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_STYLE = {
  pending_payment: 'bg-sand/25 text-accent border-none',
  confirmed: 'bg-primary/15 text-primary border-none',
  packed: 'bg-primary/15 text-primary border-none',
  out_for_delivery: 'bg-primary/25 text-primary border-none',
  delivered: 'bg-primary text-primary-foreground border-none',
  cancelled: 'bg-destructive/15 text-destructive border-none',
}

function BoxIllustration() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden>
      <ellipse cx="64" cy="106" rx="38" ry="6" fill="hsl(106 22% 45% / 0.12)" />
      <path d="M28 50L64 32L100 50V92L64 110L28 92V50Z" fill="hsl(38 48% 68% / 0.3)" stroke="hsl(106 22% 45%)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 50L64 68L100 50" stroke="hsl(106 22% 45%)" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
      <path d="M64 68V110" stroke="hsl(106 22% 45%)" strokeWidth="2.5" />
      <path d="M46 41L82 59" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.5" />
      <path d="M58 30C58 30 50 24 52 16C60 18 58 30 58 30Z" fill="hsl(106 22% 60%)" />
    </svg>
  )
}

export default function OrdersClient() {
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    proxy('/orders')
      .then(setOrders)
      .catch((err) => {
        setOrders([])
        toast.error(err.message || 'Could not load your orders.')
      })
  }, [])

  return (
    <DashboardPageShell className="max-w-3xl">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <Package className="h-4 w-4" />
        </span>
        <div>
          <p className="eyebrow text-primary">Marketplace</p>
          <h1 className="font-serif text-3xl">My orders</h1>
        </div>
      </div>

      {orders === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
          <BoxIllustration />
          <p className="mt-4 text-sm text-muted-foreground">No orders yet — saplings you buy will show up here.</p>
          <Link href="/dashboard/individual/nurseries" className="mt-3 inline-block text-sm text-primary hover:underline">
            Browse nurseries
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/individual/orders/${order.id}`}
              className="flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-5 soft-shadow transition hover:border-primary/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary text-xl">
                🌿
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg truncate">{order.nursery.nurseryName}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {order.items.map((i) => `${i.species} × ${i.quantity}`).join(', ')}
                </p>
                <Badge className={cn('mt-2', STATUS_STYLE[order.status])}>{STATUS_LABEL[order.status]}</Badge>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatRupees(order.totalCents)}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardPageShell>
  )
}

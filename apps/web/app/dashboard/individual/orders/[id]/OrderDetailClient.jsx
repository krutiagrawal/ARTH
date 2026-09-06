'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Check, CheckCircle2, Package, PackageCheck, Phone, Sprout, Star, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'
import { cn } from '@/lib/utils'

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

const STAGES = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
]

function ReviewForm({ orderId, onSubmitted }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await proxy(`/orders/${orderId}/review`, { method: 'POST', body: { nurseryRating: rating, comment: comment.trim() || undefined } })
      toast.success('Thanks for your review!')
      onSubmitted()
    } catch (err) {
      toast.error(err.message || 'Could not submit your review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow">
      <p className="font-serif text-lg">Rate this nursery</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star className={cn('h-6 w-6', n <= rating ? 'fill-primary text-primary' : 'text-border')} />
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3 rounded-2xl"
        placeholder="How was the delivery? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button variant="outline" className="mt-3 rounded-full" onClick={submit} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit review'}
      </Button>
    </div>
  )
}

export default function OrderDetailClient({ orderId }) {
  const [order, setOrder] = useState(null)

  const load = () => proxy(`/orders/${orderId}`).then(setOrder).catch((err) => toast.error(err.message || 'Could not load this order.'))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  if (!order) {
    return (
      <DashboardPageShell className="max-w-2xl">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  const currentIndex = STAGES.findIndex((s) => s.key === order.status)

  return (
    <DashboardPageShell className="max-w-2xl">
      <Link href="/dashboard/individual/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My orders
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl">🌿</span>
          <h1 className="font-serif text-2xl md:text-3xl">{order.nursery.nurseryName}</h1>
        </div>

        {order.status === 'cancelled' ? (
          <Badge variant="destructive" className="mt-5">This order was cancelled.</Badge>
        ) : (
          <div className="mt-8 flex items-start">
            {STAGES.map((stage, i) => {
              const reached = currentIndex >= i
              const Icon = stage.icon
              return (
                <div key={stage.key} className="flex flex-1 flex-col items-center relative">
                  {i > 0 && (
                    <div className={cn('absolute right-1/2 top-4 h-0.5 w-full -z-0', currentIndex >= i ? 'bg-primary' : 'bg-secondary')} />
                  )}
                  <span
                    className={cn(
                      'relative z-10 grid h-8 w-8 place-items-center rounded-full transition-colors',
                      reached ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={cn('mt-2 text-[11px] text-center', reached ? 'text-primary font-medium' : 'text-muted-foreground')}>
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {order.status === 'out_for_delivery' && (
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 soft-shadow">
          <p className="flex items-center gap-2 font-serif text-lg"><Truck className="h-4 w-4 text-primary" /> On its way</p>
          {order.tracking?.etaMinutes != null && <p className="mt-2 text-sm text-muted-foreground">Arriving in ~{order.tracking.etaMinutes} min</p>}
          {order.deliveryOtp && (
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery OTP: <span className="font-semibold tracking-widest text-foreground">{order.deliveryOtp}</span>
            </p>
          )}
          {order.tracking?.riderName && (
            <a
              href={order.tracking.riderPhone ? `tel:${order.tracking.riderPhone}` : undefined}
              className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" /> {order.tracking.riderName}
              {order.tracking.riderPhone ? ` · ${order.tracking.riderPhone}` : ''}
            </a>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5">
        <p className="eyebrow mb-3">Items</p>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sprout className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm">{item.species} × {item.quantity}</span>
              <span className="text-sm text-muted-foreground">{formatRupees(item.unitPriceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-border/70 pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery fee</span>
            <span>{order.deliveryFeeCents === 0 ? 'Free' : formatRupees(order.deliveryFeeCents)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatRupees(order.totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5">
        <p className="eyebrow mb-2">Delivering to</p>
        <p className="text-sm">
          {[order.address.line1, order.address.line2, order.address.landmark, `${order.address.city} ${order.address.pincode}`].filter(Boolean).join(', ')}
        </p>
      </div>

      {order.status === 'delivered' && !order.review && <ReviewForm orderId={order.id} onSubmitted={load} />}
      {order.review && (
        <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Check className="h-4 w-4 text-primary" /> Your rating: {'★'.repeat(order.review.nurseryRating)}
          </p>
          {order.review.comment && <p className="mt-1.5 text-sm text-muted-foreground">{order.review.comment}</p>}
        </div>
      )}
    </DashboardPageShell>
  )
}

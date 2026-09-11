'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Truck, Printer, QrCode, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import QrCodeCanvas from '@/components/dashboard/QrCodeCanvas'
import { proxy } from '../../proxy'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const STATUS_LABEL = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  plantation_verified: 'Plantation verified',
  cancelled: 'Cancelled',
}

const CANCELLABLE = ['confirmed', 'packed', 'ready_for_pickup', 'out_for_delivery']

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function DispatchDialog({ open, onOpenChange, onSubmit, loading }) {
  const [riderName, setRiderName] = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dispatch this order"
      description="Optionally add rider details so the buyer can track their delivery."
      confirmLabel={loading ? 'Dispatching…' : 'Dispatch'}
      loading={loading}
      onConfirm={() => onSubmit({ riderName: riderName || undefined, riderPhone: riderPhone || undefined })}
    >
      <div className="space-y-2 py-2">
        <Input placeholder="Rider name (optional)" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
        <Input placeholder="Rider phone (optional)" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
      </div>
    </ConfirmDialog>
  )
}

function CodeDialog({ open, onOpenChange, title, description, onSubmit, loading }) {
  const [code, setCode] = useState('')
  useEffect(() => {
    if (open) setCode('')
  }, [open])
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={loading ? 'Confirming…' : 'Confirm'}
      loading={loading}
      onConfirm={() => onSubmit(code)}
    >
      <Input placeholder="4-digit handoff code" value={code} onChange={(e) => setCode(e.target.value)} className="mt-2" maxLength={4} />
    </ConfirmDialog>
  )
}

export default function OrderDetailClient({ orderId }) {
  const router = useRouter()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [pickupCodeOpen, setPickupCodeOpen] = useState(false)
  const [deliverCodeOpen, setDeliverCodeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOrder(await proxy(`/nursery/orders/${orderId}`))
    } catch (err) {
      toast.error(err.message || 'Could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async (action, body) => {
    setActing(true)
    try {
      await proxy(`/nursery/orders/${orderId}/${action}`, { method: 'POST', body })
      toast.success('Order updated.')
      await load()
      setDispatchOpen(false)
      setPickupCodeOpen(false)
      setDeliverCodeOpen(false)
      setCancelOpen(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setActing(false)
    }
  }

  if (loading || !order) {
    return (
      <DashboardPageShell className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  const saplingUnits = (order.items ?? []).flatMap((i) => i.saplingUnits ?? [])
  const showQr = !['pending_payment', 'confirmed', 'cancelled'].includes(order.status)

  return (
    <DashboardPageShell className="space-y-6 max-w-3xl">
      <Link href="/nursery/dashboard/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>

      <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Order</p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1">#{order.id.slice(0, 8)}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" /> {order.user?.name || 'Unknown buyer'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <Badge className="text-sm capitalize">{STATUS_LABEL[order.status] || order.status}</Badge>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fulfillment</p>
            <p className="mt-1 flex items-center gap-1.5 capitalize">
              {order.fulfillmentType === 'pickup' ? <MapPin className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
              {order.fulfillmentType}
            </p>
          </div>
          {order.fulfillmentType === 'pickup' ? (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup window</p>
              <p className="mt-1">{order.pickupWindowLabel || '—'}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivery address</p>
              <p className="mt-1">
                {order.address ? [order.address.line1, order.address.line2, order.address.landmark, order.address.city, order.address.pincode].filter(Boolean).join(', ') : '—'}
              </p>
            </div>
          )}
          {order.scheduledFor && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Scheduled for</p>
              <p className="mt-1">{new Date(order.scheduledFor).toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="mt-1">{rupees(order.totalCents)} ({rupees(order.subtotalCents)} + {rupees(order.deliveryFeeCents)} delivery)</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Items</p>
          <div className="divide-y divide-border/50">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span>{item.species} × {item.quantity}</span>
                <span className="text-muted-foreground">{rupees(item.unitPriceCents)} each</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {order.status === 'confirmed' && (
            <Button className="rounded-full" disabled={acting} onClick={() => runAction('pack')}>Mark packed</Button>
          )}
          {order.status === 'packed' && order.fulfillmentType === 'pickup' && (
            <Button className="rounded-full" disabled={acting} onClick={() => runAction('ready-for-pickup')}>Mark ready for pickup</Button>
          )}
          {order.status === 'packed' && order.fulfillmentType === 'delivery' && (
            <Button className="rounded-full" disabled={acting} onClick={() => setDispatchOpen(true)}>Dispatch</Button>
          )}
          {order.status === 'ready_for_pickup' && (
            <Button className="rounded-full" disabled={acting} onClick={() => setPickupCodeOpen(true)}>Confirm picked up</Button>
          )}
          {order.status === 'out_for_delivery' && (
            <Button className="rounded-full" disabled={acting} onClick={() => setDeliverCodeOpen(true)}>Mark delivered</Button>
          )}
          {CANCELLABLE.includes(order.status) && (
            <Button variant="outline" className="rounded-full text-destructive hover:text-destructive" disabled={acting} onClick={() => setCancelOpen(true)}>
              Cancel order
            </Button>
          )}
          {showQr && saplingUnits.length > 0 && (
            <Button variant="outline" className="rounded-full ml-auto" onClick={() => router.push(`/nursery/dashboard/orders/${orderId}/print`)}>
              <Printer className="h-4 w-4" /> Print QR sheet
            </Button>
          )}
        </div>
      </div>

      {showQr && (
        <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-4 w-4 text-primary" />
            <p className="font-serif text-lg">Sapling QR codes</p>
          </div>
          {saplingUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sapling units generated yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {saplingUnits.map((unit) => (
                <div key={unit.id} className="rounded-2xl border border-border/60 p-3 text-center">
                  <QrCodeCanvas value={`${SITE_URL}/sapling/${unit.id}`} size={120} className="mx-auto" />
                  <p className="mt-2 text-xs font-medium truncate">{unit.speciesNameSnapshot}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] capitalize">{unit.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DispatchDialog open={dispatchOpen} onOpenChange={setDispatchOpen} loading={acting} onSubmit={(body) => runAction('dispatch', body)} />
      <CodeDialog
        open={pickupCodeOpen}
        onOpenChange={setPickupCodeOpen}
        title="Confirm pickup"
        description="Ask the buyer for their 4-digit handoff code."
        loading={acting}
        onSubmit={(code) => runAction('picked-up', { code })}
      />
      <CodeDialog
        open={deliverCodeOpen}
        onOpenChange={setDeliverCodeOpen}
        title="Confirm delivery"
        description="Ask the buyer for their 4-digit handoff code."
        loading={acting}
        onSubmit={(code) => runAction('deliver', { code })}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this order?"
        description="This releases the reserved stock back into inventory. This cannot be undone."
        confirmLabel="Cancel order"
        destructive
        loading={acting}
        onConfirm={() => runAction('cancel')}
      />
    </DashboardPageShell>
  )
}

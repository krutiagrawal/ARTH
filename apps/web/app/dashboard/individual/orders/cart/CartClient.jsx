'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Minus, Plus, ShoppingBasket, Sprout, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function BasketIllustration() {
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden>
      <ellipse cx="64" cy="106" rx="36" ry="6" fill="hsl(106 22% 45% / 0.12)" />
      <path d="M32 60H96L88 100H40L32 60Z" fill="hsl(38 48% 68% / 0.3)" stroke="hsl(106 22% 45%)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 60H96" stroke="hsl(106 22% 45%)" strokeWidth="2.5" />
      <path d="M46 60C46 46 54 38 64 38C74 38 82 46 82 60" stroke="hsl(106 22% 45%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M48 72L52 90" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.5" />
      <path d="M64 72V90" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.5" />
      <path d="M80 72L76 90" stroke="hsl(106 22% 45%)" strokeWidth="1.5" opacity="0.5" />
      <path d="M56 44C56 44 48 40 48 30C58 32 56 44 56 44Z" fill="hsl(106 22% 60%)" />
    </svg>
  )
}

export default function CartClient() {
  const router = useRouter()
  const [cart, setCart] = useState(null)

  const load = () => proxy('/cart').then(setCart).catch((err) => toast.error(err.message || 'Could not load your cart.'))

  useEffect(() => {
    load()
  }, [])

  const updateQuantity = async (item, quantity) => {
    try {
      if (quantity < 1) {
        await proxy(`/cart/items/${item.id}`, { method: 'DELETE' })
      } else if (quantity <= item.availableQuantity) {
        await proxy(`/cart/items/${item.id}`, { method: 'PATCH', body: { quantity } })
      }
      await load()
    } catch (err) {
      toast.error(err.message || 'Could not update your cart.')
    }
  }

  if (cart === null) {
    return (
      <DashboardPageShell className="max-w-2xl">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="max-w-2xl">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <ShoppingBasket className="h-4 w-4" />
        </span>
        <h1 className="font-serif text-3xl">Your cart</h1>
      </div>

      {cart.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center">
          <BasketIllustration />
          <p className="mt-4 text-sm text-muted-foreground">Your cart is empty.</p>
          <Button asChild variant="outline" className="mt-4 rounded-full">
            <Link href="/dashboard/individual/nurseries">Browse nurseries</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Sprout className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.species}</p>
                  <p className="text-xs text-muted-foreground">{item.nursery.nurseryName} · {formatRupees(item.priceCents)} each</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item, item.quantity - 1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={item.quantity >= item.availableQuantity}
                    onClick={() => updateQuantity(item, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateQuantity(item, 0)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-semibold">{formatRupees(cart.subtotalCents)}</span>
            </div>
            <Button size="lg" className="mt-4 w-full rounded-full" onClick={() => router.push('/dashboard/individual/orders/checkout')}>
              Proceed to checkout
            </Button>
          </div>
        </>
      )}
    </DashboardPageShell>
  )
}

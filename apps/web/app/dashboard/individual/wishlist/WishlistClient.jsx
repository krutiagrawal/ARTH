'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Heart, Trash2, Sprout, Store } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

function money(cents) {
  if (cents == null) return null
  return `₹${(cents / 100).toLocaleString()}`
}

export default function WishlistClient() {
  const [items, setItems] = useState(null)

  const load = () => proxy('/wishlist').then(setItems).catch((err) => toast.error(err.message || 'Could not load your wishlist.'))
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    try {
      await proxy(`/wishlist/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Removed from wishlist.')
    } catch (err) {
      toast.error(err.message || 'Could not remove item.')
    }
  }

  return (
    <DashboardPageShell>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <Heart className="h-4 w-4" />
        </span>
        <div>
          <p className="eyebrow text-primary">Saved for later</p>
          <h1 className="font-serif text-3xl">Your wishlist</h1>
        </div>
      </div>

      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing saved yet — browse{' '}
            <Link href="/dashboard/individual/nurseries" className="text-primary underline-offset-4 hover:underline">
              nurseries
            </Link>{' '}
            and tap the heart on a sapling or nursery you like.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isStock = !!item.stock
            const title = isStock ? item.stock.species : item.nursery?.nurseryName
            const nurseryName = isStock ? item.stock.nursery?.nurseryName : null
            const href = isStock ? `/dashboard/individual/nurseries/${item.stock.nursery?.id}` : `/dashboard/individual/nurseries/${item.nursery?.id}`
            return (
              <div key={item.id} className="rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex flex-col justify-between">
                <div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground">
                    {isStock ? <Sprout className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  </span>
                  <h3 className="font-serif text-lg mt-3">{title || 'Item'}</h3>
                  {nurseryName && <p className="text-xs text-muted-foreground mt-0.5">{nurseryName}</p>}
                  {isStock && item.stock.priceCents != null && (
                    <p className="text-sm text-primary mt-2">{money(item.stock.priceCents)}</p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="rounded-full flex-1">
                    <Link href={href}>View</Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardPageShell>
  )
}

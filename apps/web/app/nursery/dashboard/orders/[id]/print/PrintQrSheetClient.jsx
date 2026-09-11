'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import QrCodeCanvas from '@/components/dashboard/QrCodeCanvas'
import { proxy } from '../../../proxy'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Printer-friendly QR handoff sheet — the sidebar/chrome around it is still in
 * the DOM (this route is nested under the dashboard layout), so print CSS hides
 * everything except `.print-area` rather than relying on a chromeless layout.
 */
export default function PrintQrSheetClient({ orderId }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxy(`/nursery/orders/${orderId}`)
      .then(setOrder)
      .catch((err) => toast.error(err.message || 'Could not load this order.'))
      .finally(() => setLoading(false))
  }, [orderId])

  const saplingUnits = (order?.items ?? []).flatMap((i) => i.saplingUnits ?? [])

  return (
    <div className="p-6 md:p-10">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/nursery/dashboard/orders/${orderId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
        <Button onClick={() => window.print()} className="rounded-full">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      {loading || !order ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="print-area">
          <h1 className="font-serif text-2xl">Sapling handoff sheet — Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {order.user?.name || 'Buyer'} · {saplingUnits.length} sapling(s) · {new Date().toLocaleDateString()}
          </p>

          {saplingUnits.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No sapling units to print for this order yet.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
              {saplingUnits.map((unit) => (
                <div key={unit.id} className="rounded-xl border border-black/20 p-4 text-center break-inside-avoid">
                  <QrCodeCanvas value={`${SITE_URL}/sapling/${unit.id}`} size={140} className="mx-auto" />
                  <p className="mt-2 text-sm font-medium">{unit.speciesNameSnapshot}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{unit.id}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PackageSearch, Truck, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import { proxy } from '../proxy'

const STATUS_VARIANT = {
  pending_payment: 'outline',
  confirmed: 'secondary',
  packed: 'secondary',
  ready_for_pickup: 'default',
  out_for_delivery: 'default',
  picked_up: 'default',
  delivered: 'default',
  plantation_verified: 'default',
  cancelled: 'destructive',
}

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

const FULFILLMENT_TABS = [
  { value: 'all', label: 'All orders' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
]

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

export default function OrdersClient() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fulfillmentType, setFulfillmentType] = useState('all')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (fulfillmentType !== 'all') params.set('fulfillmentType', fulfillmentType)
      const qs = params.toString()
      setOrders(await proxy(`/nursery/orders${qs ? `?${qs}` : ''}`))
    } catch (err) {
      toast.error(err.message || 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [status, fulfillmentType])

  useEffect(() => {
    load()
  }, [load])

  const columns = useMemo(
    () => [
      {
        id: 'buyer',
        header: 'Buyer',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.user?.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.original.items?.length ?? 0} item(s)</p>
          </div>
        ),
      },
      {
        id: 'fulfillment',
        header: 'Fulfillment',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
            {row.original.fulfillmentType === 'pickup' ? <MapPin className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
            {row.original.fulfillmentType}
          </span>
        ),
      },
      {
        accessorKey: 'totalCents',
        header: 'Total',
        cell: ({ row }) => <span className="text-sm">{rupees(row.original.totalCents)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status] || 'outline'}>{STATUS_LABEL[row.original.status] || row.original.status}</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Placed',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleString()}</span>,
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Orders</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Manage orders</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={fulfillmentType} onValueChange={setFulfillmentType}>
          <TabsList>
            {FULFILLMENT_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-full border border-border/70 bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={(row) => router.push(`/nursery/dashboard/orders/${row.id}`)}
        emptyState={<EmptyState icon={PackageSearch} title="No orders yet" body="Orders placed against your stock will show up here." />}
      />
    </DashboardPageShell>
  )
}

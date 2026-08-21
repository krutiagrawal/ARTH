'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { HandCoins, Download } from 'lucide-react'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import StatTile from '@/components/dashboard/StatTile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { proxy } from '../proxy'

const STATUS_OPTIONS = ['succeeded', 'pending', 'failed', 'refunded']

export default function DonationsClient() {
  const [donations, setDonations] = useState([])
  const [summary, setSummary] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ campaignId: '', status: 'succeeded', dateFrom: '', dateTo: '' })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.campaignId) params.set('campaignId', filters.campaignId)
    if (filters.status) params.set('status', filters.status)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    return params.toString()
  }, [filters])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await proxy(`/ngo/donations${queryString ? `?${queryString}` : ''}`)
      setDonations(res.donations)
    } catch {
      setDonations([])
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    proxy('/ngo/donations/summary').then(setSummary).catch(() => setSummary([]))
    proxy('/campaigns/mine').then(setCampaigns).catch(() => setCampaigns([]))
  }, [])

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  const columns = useMemo(
    () => [
      {
        accessorKey: 'campaignTitle',
        header: 'Campaign',
        cell: ({ row }) => <p className="font-medium">{row.original.campaignTitle}</p>,
      },
      {
        id: 'donor',
        header: 'Donor',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.donor?.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.donor?.handle}</p>
          </div>
        ),
      },
      {
        accessorKey: 'amountCents',
        header: 'Amount',
        cell: ({ row }) => <span className="font-medium">₹{(row.original.amountCents / 100).toLocaleString()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <span className="text-sm capitalize text-muted-foreground">{row.original.status}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
    ],
    [],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Donations</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-2">Donations received</h1>
          <p className="mt-2 text-sm text-muted-foreground">Every donation across all of your campaigns.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full shrink-0">
          <a href={`/api/ngo/proxy/ngo/donations/export${queryString ? `?${queryString}` : ''}`} download="donations.csv">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {summary.map((s) => (
            <StatTile
              key={s.campaignId}
              label={s.campaignTitle}
              value={`₹${(s.totalAmountCents / 100).toLocaleString()}`}
              icon={HandCoins}
              description={`${s.donationCount} donation${s.donationCount === 1 ? '' : 's'}`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card p-4 soft-shadow">
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Campaign</span>
          <select
            value={filters.campaignId}
            onChange={setFilter('campaignId')}
            className="mt-1 h-9 rounded-full border border-border/70 bg-background px-3 text-sm"
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">Status</span>
          <select
            value={filters.status}
            onChange={setFilter('status')}
            className="mt-1 h-9 rounded-full border border-border/70 bg-background px-3 text-sm capitalize"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">From</span>
          <Input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} className="mt-1 h-9 rounded-full" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-muted-foreground">To</span>
          <Input type="date" value={filters.dateTo} onChange={setFilter('dateTo')} className="mt-1 h-9 rounded-full" />
        </label>
      </div>

      <DataTable
        columns={columns}
        data={donations}
        loading={loading}
        searchKey="campaignTitle"
        searchPlaceholder="Search by campaign…"
        emptyState={
          <EmptyState
            icon={HandCoins}
            title="No donations yet"
            body="Donations to your campaigns will show up here once supporters start giving."
          />
        }
      />
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Heart, Download, Edit3 } from 'lucide-react'
import DrawerFormShell, { DetailPanel, DetailSection, DetailRow, DetailGrid, DetailList } from '@/components/dashboard/DrawerFormShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { proxy } from '../proxy'

const STATUS_VARIANT = { active: 'default', closed: 'secondary' }

function rupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function downloadCsv(filename, rows) {
  const header = 'Name,Handle,Amount (INR),Date\n'
  const body = rows
    .map((r) => [r.name, r.handle, (r.amountCents / 100).toFixed(2), new Date(r.donatedAt).toISOString()].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CampaignDetailSheet({ campaign, onOpenChange, onEdit }) {
  const [loading, setLoading] = useState(true)
  const [donations, setDonations] = useState([])

  useEffect(() => {
    if (!campaign) return
    setLoading(true)
    proxy(`/campaigns/${campaign.id}/donations`)
      .then((data) => setDonations(data.donations))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [campaign])

  const pct = campaign?.goalAmountCents
    ? Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100))
    : null

  return (
    <DrawerFormShell
      open={Boolean(campaign)}
      onOpenChange={onOpenChange}
      icon={Heart}
      eyebrow="NGO Dashboard"
      title={campaign?.title}
      description="Full details and donor activity for this campaign."
      widthClassName="w-full sm:max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-[8px] px-3 text-xs" onClick={() => onEdit(campaign)}>
            <Edit3 className="h-3.5 w-3.5" /> Edit campaign
          </Button>
        </>
      }
    >
      {campaign && (
        <DetailPanel>
          <DetailSection label="Overview">
            <DetailGrid>
              <DetailRow label="Status">
                <Badge variant={STATUS_VARIANT[campaign.status] || 'outline'} className="capitalize">
                  {campaign.status}
                </Badge>
              </DetailRow>
              <DetailRow label="Started">{campaign.createdAt && new Date(campaign.createdAt).toLocaleDateString()}</DetailRow>
              <DetailRow label="Description" full>
                <p className="whitespace-pre-line">{campaign.description}</p>
              </DetailRow>
            </DetailGrid>
          </DetailSection>

          <DetailSection label="Progress">
            <p className="flex items-center gap-1.5 text-[14px] text-foreground">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
              {rupees(campaign.raisedAmountCents)}
              <span className="text-muted-foreground">
                {campaign.goalAmountCents ? `of ${rupees(campaign.goalAmountCents)} goal` : 'raised so far (no goal set)'}
              </span>
            </p>
            {pct !== null && <Progress value={pct} className="mt-3 h-1.5" />}
          </DetailSection>

          <DetailSection label={`Donors (${donations.length})`}>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : donations.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No donations yet.</p>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-[7px] px-2.5 text-xs"
                  onClick={() => downloadCsv(`${campaign.title.replace(/[^a-z0-9]+/gi, '-')}-donors.csv`, donations)}
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <DetailList>
                  {donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2.5 first:pt-3 last:pb-0">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">{d.name}</p>
                        <p className="text-[12px] text-muted-foreground">{d.handle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-medium text-foreground">{rupees(d.amountCents)}</p>
                        <p className="text-[12px] text-muted-foreground">{new Date(d.donatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </DetailList>
              </>
            )}
          </DetailSection>
        </DetailPanel>
      )}
    </DrawerFormShell>
  )
}

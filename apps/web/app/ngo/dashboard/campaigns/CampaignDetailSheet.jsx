'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Heart, Download, Edit3 } from 'lucide-react'
import DrawerFormShell, { FormSection, DetailRow, DetailGrid } from '@/components/dashboard/DrawerFormShell'
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
        <>
          <FormSection first label="Overview">
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
          </FormSection>

          <FormSection label="Progress">
            <p className="flex items-center gap-1 text-[13px]">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" />
              {rupees(campaign.raisedAmountCents)}
              {campaign.goalAmountCents ? ` of ${rupees(campaign.goalAmountCents)} goal` : ' raised so far (no goal set)'}
            </p>
            {pct !== null && <Progress value={pct} className="h-1.5 mt-2" />}
          </FormSection>

          <FormSection label={`Donors (${donations.length})`}>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : donations.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No donations yet.</p>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-[7px] px-2.5 text-xs mb-2"
                  onClick={() => downloadCsv(`${campaign.title.replace(/[^a-z0-9]+/gi, '-')}-donors.csv`, donations)}
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
                <div className="space-y-1.5">
                  {donations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-[8px] border border-border/60 px-2.5 py-1.5">
                      <div>
                        <p className="text-[13px] font-medium">{d.name}</p>
                        <p className="text-[11px] text-muted-foreground">{d.handle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium">{rupees(d.amountCents)}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(d.donatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </FormSection>
        </>
      )}
    </DrawerFormShell>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import DataTable from '@/components/dashboard/DataTable'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import EmptyState from '@/components/dashboard/EmptyState'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import StatTile from '@/components/dashboard/StatTile'
import { Section, Field } from '@/components/dashboard/DetailSection'
import { proxy } from '@/lib/adminProxyClient'
import { resolveMediaUrl } from '@/lib/media'

const STATUS_VARIANT = { pending: 'outline', approved: 'default', rejected: 'destructive', suspended: 'secondary' }
const FILTERS = ['pending', 'approved', 'rejected', 'suspended']

const ORG_TYPE_LABELS = {
  trust: 'Trust',
  society: 'Society',
  section8_company: 'Section 8 company',
  registered_nonprofit: 'Registered non-profit',
  other: 'Other',
}

const WORK_AREA_LABELS = {
  tree_plantation: 'Tree plantation',
  forest_restoration: 'Forest restoration',
  urban_greening: 'Urban greening',
  biodiversity: 'Biodiversity',
  water_conservation: 'Water conservation',
  waste_management: 'Waste management',
  environmental_education: 'Environmental education',
  rural_community_development: 'Rural/community development',
  other: 'Other',
}

const ARTH_USAGE_LABELS = {
  organise_plantation_drives: 'Organise plantation drives',
  recruit_volunteers: 'Recruit volunteers',
  source_saplings: 'Source saplings',
  track_planted_trees: 'Track planted trees',
  manage_corporate_school_programs: 'Manage corporate/school programs',
  receive_donations: 'Receive donations',
  showcase_projects: 'Showcase projects',
  other: 'Other',
}

const PARTICIPANT_TYPE_LABELS = {
  individuals: 'Individuals',
  schools: 'Schools',
  colleges: 'Colleges',
  corporates: 'Corporates',
  government: 'Government',
  communities: 'Communities',
  volunteers: 'Volunteers',
  other_ngos: 'Other NGOs',
}

const DOCUMENT_TYPE_LABELS = {
  registration_certificate: 'Registration certificate',
  twelve_a_certificate: '12A/12AB certificate',
  eighty_g_certificate: '80G certificate',
  fcra_certificate: 'FCRA certificate',
  csr1_certificate: 'CSR-1 certificate',
  authorization_proof: 'Authorisation proof',
}

function ChipList({ values, labels }) {
  if (!values?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="font-normal">
          {labels[v] || v}
        </Badge>
      ))}
    </div>
  )
}

function LinkList({ links }) {
  if (!links?.length) return null
  return (
    <div className="space-y-1">
      {links.map((link, i) => (
        <a key={`${link}-${i}`} href={link} target="_blank" rel="noreferrer" className="block truncate text-sm text-primary underline">
          {link}
        </a>
      ))}
    </div>
  )
}

function NgoDetailSheet({ ngo, onOpenChange, onAction }) {
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'approve' | 'reject' | 'suspend' | 'reinstate'
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!ngo) return
    setLoadingSummary(true)
    proxy(`/admin/ngos/${ngo.id}/summary`)
      .then(setSummary)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingSummary(false))
  }, [ngo])

  useEffect(() => {
    if (!ngo) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    proxy(`/admin/ngos/${ngo.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || "Couldn't load this NGO's details.")
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [ngo])

  const confirmCopy = {
    approve: { title: 'Approve this NGO?', confirmLabel: 'Approve', body: 'They can immediately start publishing drives, trees, and campaigns.', status: 'approved' },
    reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
    suspend: { title: 'Suspend this NGO?', confirmLabel: 'Suspend', body: "They keep read access to their history but can't publish anything new until reinstated.", status: 'suspended' },
    reinstate: { title: 'Reinstate this NGO?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
  }

  const runAction = async () => {
    if (!confirm) return
    const { status } = confirmCopy[confirm]
    setWorking(true)
    try {
      await onAction(ngo.id, status, reason)
      toast.success(`NGO ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  if (!ngo) return null
  const d = detail || ngo
  const documents = d.documents ?? []
  const pastWorkPhotos = documents.filter((doc) => doc.docType === 'past_work_photo')
  const certificates = documents.filter((doc) => doc.docType !== 'past_work_photo')

  return (
    <>
      <Sheet open={Boolean(ngo)} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="font-serif">{d.orgName}</SheetTitle>
            <SheetDescription>
              {d.owner?.name} · {d.owner?.email}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Badge variant={STATUS_VARIANT[d.status]} className="capitalize">
                {d.status}
              </Badge>
              {d.rejectionReason && <p className="mt-2 text-sm text-muted-foreground">Reason on file: &ldquo;{d.rejectionReason}&rdquo;</p>}
            </div>

            <p className="text-sm text-muted-foreground">{d.description}</p>

            {loadingDetail && !detail ? (
              <p className="text-sm text-muted-foreground">Loading full application…</p>
            ) : (
              <>
                {documents.length > 0 && (
                  <Section title="Documents">
                    {pastWorkPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pastWorkPhotos.map((doc) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={doc.id}
                            src={resolveMediaUrl(doc.fileUrl)}
                            alt="Past plantation work"
                            className="h-24 w-24 rounded-lg border border-border/70 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {certificates.map((doc) => (
                      <a
                        key={doc.id}
                        href={resolveMediaUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-primary underline"
                      >
                        {DOCUMENT_TYPE_LABELS[doc.docType] || doc.docType} · View
                      </a>
                    ))}
                  </Section>
                )}

                <Section title="Organisation">
                  <Field label="Type" value={d.orgType ? ORG_TYPE_LABELS[d.orgType] || d.orgType : null} />
                  <Field label="Year established" value={d.foundedYear} />
                  <Field
                    label="Website"
                    value={
                      d.website ? (
                        <a href={d.website} target="_blank" rel="noreferrer" className="text-primary underline">
                          {d.website}
                        </a>
                      ) : null
                    }
                  />
                  <Field label="Official email" value={d.officialEmail} />
                  <Field label="Official phone" value={d.contactPhone ? `+91 ${d.contactPhone}` : null} />
                  {d.socialMediaLinks?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Social media</p>
                      <LinkList links={d.socialMediaLinks} />
                    </div>
                  )}
                </Section>

                {(d.line1 || d.city || d.operatingCities?.length > 0 || d.operatingStates?.length > 0) && (
                  <Section title="Address">
                    <Field label="Registered address" value={d.line1} />
                    <Field label="City" value={d.city} />
                    <Field label="Operating cities" value={d.operatingCities?.length ? d.operatingCities.join(', ') : null} />
                    <Field label="Operating states" value={d.operatingStates?.length ? d.operatingStates.join(', ') : null} />
                  </Section>
                )}

                {(d.registrationNumber || d.panNumber || d.ngoDarpanId || d.twelveARegistrationNumber || d.eightyGRegistrationNumber || d.fcraRegistrationNumber || d.csr1RegistrationNumber) && (
                  <Section title="Registration & legal">
                    <Field label="Registration number" value={d.registrationNumber} />
                    <Field label="Registration authority" value={d.registrationAuthority} />
                    <Field label="PAN" value={d.panNumber} />
                    <Field label="NGO Darpan ID" value={d.ngoDarpanId} />
                    <Field label="12A/12AB number" value={d.twelveARegistrationNumber} />
                    <Field label="80G number" value={d.eightyGRegistrationNumber} />
                    <Field label="FCRA number" value={d.fcraRegistrationNumber} />
                    <Field label="CSR-1 number" value={d.csr1RegistrationNumber} />
                  </Section>
                )}

                {(d.primaryContactName || d.officeBearers?.length > 0) && (
                  <Section title="People">
                    <Field label="Primary contact" value={d.primaryContactName} />
                    <Field label="Designation" value={d.primaryContactDesignation} />
                    <Field label="Phone" value={d.primaryContactPhone ? `+91 ${d.primaryContactPhone}` : null} />
                    <Field label="Email" value={d.primaryContactEmail} />
                    {d.officeBearers?.map((bearer, i) => (
                      <Field
                        key={i}
                        label={`Office bearer ${i + 1}`}
                        value={[bearer.name, bearer.designation, bearer.phone ? `+91 ${bearer.phone}` : null].filter(Boolean).join(' · ')}
                      />
                    ))}
                  </Section>
                )}

                <Section title="What they do">
                  <ChipList values={d.primaryWorkAreas} labels={WORK_AREA_LABELS} />
                  <Field label="Drives conducted (historical)" value={d.drivesConductedHistorical} />
                  <Field label="Trees planted (historical)" value={d.treesPlantedHistorical} />
                  <Field label="Active volunteers" value={d.volunteerCountEstimate} />
                  <Field label="Major projects" value={d.majorProjectsDescription} />
                  <Field label="Environmental work since" value={d.environmentalWorkSinceYear} />
                </Section>

                {d.conductsPlantationDrives != null && (
                  <Section title="Plantation practices">
                    <Field label="Conducts plantation drives" value={d.conductsPlantationDrives ? 'Yes' : 'No'} />
                    <Field label="Typical saplings per drive" value={d.typicalSaplingsPerDrive} />
                    <Field label="Typical locations" value={d.typicalDriveLocations} />
                    <Field label="Species commonly planted" value={d.speciesCommonlyPlanted} />
                    <Field label="Sapling source" value={d.saplingSourceDescription} />
                    <Field label="Monitors survival post-planting" value={d.monitorsSurvivalPostPlanting == null ? null : d.monitorsSurvivalPostPlanting ? 'Yes' : 'No'} />
                    <Field label="Does post-plantation maintenance" value={d.doesPostPlantationMaintenance == null ? null : d.doesPostPlantationMaintenance ? 'Yes' : 'No'} />
                    <Field label="Verification method" value={d.plantationVerificationMethod} />
                    {d.previousProjectLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Previous project links</p>
                        <LinkList links={d.previousProjectLinks} />
                      </div>
                    )}
                  </Section>
                )}

                {(d.driveReportLinks?.length > 0 ||
                  d.mediaCoverageLinks?.length > 0 ||
                  d.projectPageLinks?.length > 0 ||
                  d.annualReportLinks?.length > 0 ||
                  d.impactReportLinks?.length > 0 ||
                  d.socialMediaPostLinks?.length > 0) && (
                  <Section title="Proof of previous work">
                    {d.driveReportLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Drive reports</p>
                        <LinkList links={d.driveReportLinks} />
                      </div>
                    )}
                    {d.mediaCoverageLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Media coverage</p>
                        <LinkList links={d.mediaCoverageLinks} />
                      </div>
                    )}
                    {d.projectPageLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Project pages</p>
                        <LinkList links={d.projectPageLinks} />
                      </div>
                    )}
                    {d.annualReportLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Annual reports</p>
                        <LinkList links={d.annualReportLinks} />
                      </div>
                    )}
                    {d.impactReportLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Impact reports</p>
                        <LinkList links={d.impactReportLinks} />
                      </div>
                    )}
                    {d.socialMediaPostLinks?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Social media posts</p>
                        <LinkList links={d.socialMediaPostLinks} />
                      </div>
                    )}
                  </Section>
                )}

                {(d.arthUsageGoals?.length > 0 || d.participantTypes?.length > 0 || d.expectedDrivesPerYear) && (
                  <Section title="ARTH goals">
                    <ChipList values={d.arthUsageGoals} labels={ARTH_USAGE_LABELS} />
                    <Field label="Expected drives/year via ARTH" value={d.expectedDrivesPerYear} />
                    <ChipList values={d.participantTypes} labels={PARTICIPANT_TYPE_LABELS} />
                  </Section>
                )}

                <div>
                  <p className="eyebrow mb-3">Activity</p>
                  {loadingSummary ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <StatTile label="Drives" value={summary.drivesCount} />
                      <StatTile label="Campaigns" value={summary.campaignsCount} />
                      <StatTile label="Trees listed" value={summary.treesCount} />
                      <StatTile label="Total raised" value={`₹${(summary.totalRaisedCents / 100).toLocaleString()}`} />
                    </div>
                  )}
                </div>

                <Section title="Account">
                  <Field label="Handle" value={d.owner?.handle ? `@${d.owner.handle}` : null} />
                  <Field label="Applied" value={new Date(d.createdAt).toLocaleString()} />
                </Section>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {d.status === 'pending' && (
                <>
                  <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setConfirm('reject')}>
                    <ShieldX className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {d.status === 'approved' && (
                <Button variant="outline" className="rounded-full" onClick={() => setConfirm('suspend')}>
                  <ShieldAlert className="h-4 w-4" /> Suspend
                </Button>
              )}
              {d.status === 'suspended' && (
                <Button className="rounded-full" onClick={() => setConfirm('reinstate')}>
                  <ShieldQuestion className="h-4 w-4" /> Reinstate
                </Button>
              )}
              {d.status === 'rejected' && (
                <Button className="rounded-full" onClick={() => setConfirm('approve')}>
                  <ShieldCheck className="h-4 w-4" /> Approve
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? confirmCopy[confirm].title : ''}
        description={confirm ? confirmCopy[confirm].body : ''}
        confirmLabel={confirm ? confirmCopy[confirm].confirmLabel : ''}
        destructive={confirm === 'reject' || confirm === 'suspend'}
        loading={working}
        onConfirm={runAction}
      >
        {(confirm === 'reject' || confirm === 'suspend') && (
          <label className="block">
            <span className="eyebrow">Reason (shown to the NGO)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'Approve this NGO?', confirmLabel: 'Approve', body: 'They can immediately start publishing drives, trees, and campaigns.', status: 'approved' },
  reject: { title: 'Reject this application?', confirmLabel: 'Reject', body: 'They can edit their details and resubmit.', status: 'rejected' },
  suspend: { title: 'Suspend this NGO?', confirmLabel: 'Suspend', body: "They keep read access to their history but can't publish anything new until reinstated.", status: 'suspended' },
  reinstate: { title: 'Reinstate this NGO?', confirmLabel: 'Reinstate', body: 'They regain full publishing access.', status: 'approved' },
}

function RowActions({ ngo, onAction, onViewDetails }) {
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)

  const runAction = async () => {
    if (!confirm) return
    const { status } = CONFIRM_COPY[confirm]
    setWorking(true)
    try {
      await onAction(ngo.id, status, reason)
      toast.success(`NGO ${confirm === 'reinstate' ? 'reinstated' : status}.`)
      setConfirm(null)
      setReason('')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {ngo.status === 'pending' && (
        <>
          <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
            <ShieldCheck className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('reject')}>
            <ShieldX className="h-3.5 w-3.5" /> Reject
          </Button>
        </>
      )}
      {ngo.status === 'approved' && (
        <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => setConfirm('suspend')}>
          <ShieldAlert className="h-3.5 w-3.5" /> Suspend
        </Button>
      )}
      {ngo.status === 'suspended' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('reinstate')}>
          <ShieldQuestion className="h-3.5 w-3.5" /> Reinstate
        </Button>
      )}
      {ngo.status === 'rejected' && (
        <Button size="sm" className="rounded-full h-8" onClick={() => setConfirm('approve')}>
          <ShieldCheck className="h-3.5 w-3.5" /> Approve
        </Button>
      )}
      <Button size="sm" variant="ghost" className="rounded-full h-8" onClick={() => onViewDetails(ngo)}>
        Details
      </Button>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? CONFIRM_COPY[confirm].title : ''}
        description={confirm ? CONFIRM_COPY[confirm].body : ''}
        confirmLabel={confirm ? CONFIRM_COPY[confirm].confirmLabel : ''}
        destructive={confirm === 'reject' || confirm === 'suspend'}
        loading={working}
        onConfirm={runAction}
      >
        {(confirm === 'reject' || confirm === 'suspend') && (
          <label className="block">
            <span className="eyebrow">Reason (shown to the NGO)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2" />
          </label>
        )}
      </ConfirmDialog>
    </div>
  )
}

export default function AdminNgosClient() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [filter, setFilter] = useState(FILTERS.includes(initialStatus) ? initialStatus : 'pending')
  const [ngos, setNgos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await proxy(`/admin/ngos?status=${filter}`)
      setNgos(data.ngos)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id, status, reason) => {
    await proxy(`/admin/ngos/${id}/status`, { method: 'PATCH', body: { status, rejectionReason: reason || undefined } })
    await load()
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: 'orgName',
        header: 'Organization',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.orgName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{row.original.description}</p>
          </div>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{row.original.owner?.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.owner?.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Applied',
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <RowActions ngo={row.original} onAction={handleAction} onViewDetails={setSelected} />,
      },
    ],
    [handleAction],
  )

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">NGOs</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Approvals</h1>
      </div>

      <div className="flex gap-2 border-b border-border/70">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition ${
              filter === f ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={ngos}
        loading={loading}
        searchKey="orgName"
        searchPlaceholder="Search organizations…"
        emptyState={<EmptyState icon={ShieldCheck} title={`No ${filter} NGOs`} body="Nothing to review here right now." />}
      />

      <NgoDetailSheet ngo={selected} onOpenChange={(open) => !open && setSelected(null)} onAction={handleAction} />
    </DashboardPageShell>
  )
}

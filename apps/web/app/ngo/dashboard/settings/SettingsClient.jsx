'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import PhotoUploadField from '@/components/dashboard/PhotoUploadField'
import CitySelect from '@/components/dashboard/CitySelect'
import PhoneInput from '@/components/dashboard/PhoneInput'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import ChipSelect from '@/components/forms/ChipSelect'
import ChipListInput from '@/components/forms/ChipListInput'
import OfficeBearerRepeater from '@/components/forms/OfficeBearerRepeater'
import { useNgoProfile } from '../NgoProfileContext'
import { proxy } from '../proxy'
import { usePhoneField } from '@/lib/usePhoneField'
import { isValidWebsite, isValidEmail } from '@/lib/validation'

const ORG_TYPE_OPTIONS = [
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'section8_company', label: 'Section 8 company' },
  { value: 'registered_nonprofit', label: 'Registered non-profit' },
  { value: 'other', label: 'Other' },
]

const WORK_AREA_OPTIONS = [
  { value: 'tree_plantation', label: 'Tree plantation', icon: '🌳' },
  { value: 'forest_restoration', label: 'Forest restoration', icon: '🌲' },
  { value: 'urban_greening', label: 'Urban greening', icon: '🏙️' },
  { value: 'biodiversity', label: 'Biodiversity', icon: '🦋' },
  { value: 'water_conservation', label: 'Water conservation', icon: '💧' },
  { value: 'waste_management', label: 'Waste management', icon: '♻️' },
  { value: 'environmental_education', label: 'Environmental education', icon: '📚' },
  { value: 'rural_community_development', label: 'Rural/community development', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '➕' },
]

const SAPLINGS_PER_DRIVE_OPTIONS = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_200', label: '50 – 200' },
  { value: '200_500', label: '200 – 500' },
  { value: '500_plus', label: '500+' },
]

const ARTH_USAGE_OPTIONS = [
  { value: 'organise_plantation_drives', label: 'Organise plantation drives', icon: '🌱' },
  { value: 'recruit_volunteers', label: 'Recruit volunteers', icon: '🙋' },
  { value: 'source_saplings', label: 'Source saplings', icon: '🪴' },
  { value: 'track_planted_trees', label: 'Track planted trees', icon: '📍' },
  { value: 'manage_corporate_school_programs', label: 'Manage corporate/school programs', icon: '🏫' },
  { value: 'receive_donations', label: 'Receive donations', icon: '💚' },
  { value: 'showcase_projects', label: 'Showcase projects', icon: '📣' },
  { value: 'other', label: 'Other', icon: '➕' },
]

const PARTICIPANT_TYPE_OPTIONS = [
  { value: 'individuals', label: 'Individuals' },
  { value: 'schools', label: 'Schools' },
  { value: 'colleges', label: 'Colleges' },
  { value: 'corporates', label: 'Corporates' },
  { value: 'government', label: 'Government' },
  { value: 'communities', label: 'Communities' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'other_ngos', label: 'Other NGOs' },
]

const TEXT_FIELDS = [
  'line1', 'officialEmail', 'registrationNumber', 'registrationAuthority', 'panNumber', 'ngoDarpanId',
  'twelveARegistrationNumber', 'eightyGRegistrationNumber', 'fcraRegistrationNumber', 'csr1RegistrationNumber',
  'primaryContactName', 'primaryContactDesignation', 'primaryContactEmail', 'majorProjectsDescription',
  'typicalDriveLocations', 'speciesCommonlyPlanted', 'saplingSourceDescription', 'plantationVerificationMethod',
]
const NUMBER_FIELDS = ['drivesConductedHistorical', 'treesPlantedHistorical', 'environmentalWorkSinceYear', 'expectedDrivesPerYear']
const BOOL_FIELDS = ['conductsPlantationDrives', 'monitorsSurvivalPostPlanting', 'doesPostPlantationMaintenance']
const COMMA_LIST_FIELDS = ['operatingCities', 'operatingStates', 'primaryWorkAreas', 'arthUsageGoals', 'participantTypes']
const LINK_LIST_FIELDS = [
  'socialMediaLinks', 'previousProjectLinks', 'driveReportLinks', 'mediaCoverageLinks', 'projectPageLinks',
  'annualReportLinks', 'impactReportLinks', 'socialMediaPostLinks',
]
// Verified by an admin at approval – read-only afterwards (the API enforces it too).
const LEGAL_TEXT_FIELDS = [
  'registrationNumber', 'registrationAuthority', 'panNumber', 'ngoDarpanId',
  'twelveARegistrationNumber', 'eightyGRegistrationNumber', 'fcraRegistrationNumber', 'csr1RegistrationNumber',
]

const inputClass =
  'mt-2 w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60'
const textareaClass =
  'mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15'

// Older web registrations stored the option's label ("50 – 200") instead of its value.
function saplingsValue(stored) {
  if (!stored) return ''
  return SAPLINGS_PER_DRIVE_OPTIONS.find((o) => o.value === stored || o.label === stored)?.value ?? ''
}

function detailsFromProfile(p) {
  const d = { orgType: p.orgType || '', officeBearers: (p.officeBearers ?? []).map((b) => ({ name: b.name ?? '', designation: b.designation ?? '', phone: b.phone ?? '', email: b.email ?? '' })) }
  TEXT_FIELDS.forEach((k) => (d[k] = p[k] ?? ''))
  NUMBER_FIELDS.forEach((k) => (d[k] = p[k] ?? ''))
  BOOL_FIELDS.forEach((k) => (d[k] = Boolean(p[k])))
  ;[...COMMA_LIST_FIELDS, ...LINK_LIST_FIELDS].forEach((k) => (d[k] = p[k] ?? []))
  d.primaryContactPhone = p.primaryContactPhone ?? ''
  d.typicalSaplingsPerDrive = saplingsValue(p.typicalSaplingsPerDrive)
  return d
}

// One collapsible card per topic – the profile has ~60 fields, which read as an endless column otherwise.
function Section({ emoji, title, subtitle, children }) {
  return (
    <AccordionItem value={title} className="rounded-2xl border border-border bg-transparent px-4 last:border-b">
      <AccordionTrigger className="hover:no-underline">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary/60 text-base">{emoji}</span>
          <span>
            <span className="block text-sm font-semibold">{title}</span>
            {subtitle && <span className="block text-xs font-normal text-muted-foreground">{subtitle}</span>}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-5 pt-1">{children}</AccordionContent>
    </AccordionItem>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-foreground/30'}`}>
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
    </label>
  )
}

export default function SettingsClient() {
  const { profile, setProfile } = useNgoProfile()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [websiteTouched, setWebsiteTouched] = useState(false)

  // Legal/KYC details an admin verified at approval can't be edited afterwards.
  const legalLocked = profile?.status === 'approved' || profile?.status === 'suspended'

  // Format validation only, no real-time duplicate check – this edits NgoProfile.contactPhone (a
  // business contact number), not the User.phone identity field, so it isn't subject to the
  // registration-time "already registered" rule.
  const phoneField = usePhoneField(form?.contactPhone ?? '', phoneTouched, { checkAvailability: false })
  const websiteError = websiteTouched && form?.website?.trim() && !isValidWebsite(form.website) ? 'Enter a valid website URL' : null

  useEffect(() => {
    if (profile) {
      setForm({
        orgName: profile.orgName || '',
        description: profile.description || '',
        website: profile.website || '',
        contactPhone: profile.contactPhone || '',
        city: profile.city || 'Pune',
        foundedYear: profile.foundedYear ?? '',
        volunteerCountEstimate: profile.volunteerCountEstimate ?? '',
        awards: profile.awards?.length ? profile.awards : [],
        ...detailsFromProfile(profile),
      })
    }
  }, [profile])

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))
  const setField = (key) => (value) => setForm((s) => ({ ...s, [key]: value }))

  const addAward = () => setForm((s) => ({ ...s, awards: [...s.awards, { title: '', year: '', issuer: '' }] }))
  const removeAward = (index) => setForm((s) => ({ ...s, awards: s.awards.filter((_, i) => i !== index) }))
  const updateAward = (index, patch) =>
    setForm((s) => ({ ...s, awards: s.awards.map((a, i) => (i === index ? { ...a, ...patch } : a)) }))

  const submit = async (e) => {
    e.preventDefault()
    setPhoneTouched(true)
    setWebsiteTouched(true)
    if (!phoneField.isOk) {
      toast.error(phoneField.error || 'Enter a valid phone number.')
      return
    }
    if (form.website.trim() && !isValidWebsite(form.website)) {
      toast.error('Enter a valid website URL.')
      return
    }
    if (form.officialEmail.trim() && !isValidEmail(form.officialEmail.trim())) {
      toast.error('Enter a valid official email.')
      return
    }
    if (form.primaryContactEmail.trim() && !isValidEmail(form.primaryContactEmail.trim())) {
      toast.error("Enter a valid email for the primary contact.")
      return
    }
    setSubmitting(true)
    try {
      const cleanAwards = form.awards
        .filter((a) => a.title?.trim())
        .map((a) => ({
          title: a.title.trim(),
          ...(a.year !== '' && a.year != null ? { year: Number(a.year) } : {}),
          ...(a.issuer?.trim() ? { issuer: a.issuer.trim() } : {}),
        }))

      const payload = {
        orgName: form.orgName,
        description: form.description,
        website: form.website || undefined,
        contactPhone: form.contactPhone || undefined,
        city: form.city || undefined,
        foundedYear: form.foundedYear !== '' ? Number(form.foundedYear) : undefined,
        volunteerCountEstimate: form.volunteerCountEstimate !== '' ? Number(form.volunteerCountEstimate) : undefined,
      }
      TEXT_FIELDS.forEach((k) => {
        if (legalLocked && LEGAL_TEXT_FIELDS.includes(k)) return
        const value = typeof form[k] === 'string' ? form[k].trim() : form[k]
        // Emails can't be cleared with '' (the API validates the format), so only non-empty ones are sent.
        if (value !== '' || !/email/i.test(k)) payload[k] = value
      })
      payload.primaryContactPhone = form.primaryContactPhone || undefined
      NUMBER_FIELDS.forEach((k) => {
        if (form[k] !== '' && form[k] != null) payload[k] = Number(form[k])
      })
      BOOL_FIELDS.forEach((k) => (payload[k] = form[k]))
      payload.typicalSaplingsPerDrive = form.typicalSaplingsPerDrive || undefined
      if (!legalLocked) {
        payload.orgType = form.orgType || undefined
        payload.officeBearers = form.officeBearers.filter((b) => b.name.trim())
      }
      COMMA_LIST_FIELDS.forEach((k) => (payload[k] = form[k]))
      LINK_LIST_FIELDS.forEach((k) => (payload[k] = form[k]))

      let updated
      if (logoFile) {
        // Multipart: everything is a string - lists are comma-joined / JSON-encoded like registration does.
        const body = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          if (v === undefined) return
          if (COMMA_LIST_FIELDS.includes(k)) body.append(k, v.join(','))
          else if (LINK_LIST_FIELDS.includes(k) || k === 'officeBearers') body.append(k, JSON.stringify(v))
          else body.append(k, v)
        })
        body.append('awards', JSON.stringify(cleanAwards))
        body.append('logo', logoFile)
        updated = await proxy('/ngo/profile', { method: 'PATCH', body })
      } else {
        updated = await proxy('/ngo/profile', { method: 'PATCH', body: { ...payload, awards: cleanAwards } })
      }
      setProfile(updated)
      setLogoFile(null)
      toast.success('Organization details saved.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  // Gate on the data itself, not `loading` – once a profile has loaded once, some other consumer
  // of this shared context re-running `refresh()` (flipping `loading` back to true) must never
  // blank this page's already-filled-in form back out to a skeleton from under the person editing it.
  if (!form) {
    return (
      <DashboardPageShell className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full max-w-2xl" />
      </DashboardPageShell>
    )
  }

  const lockedProps = { disabled: legalLocked }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Settings</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Organization profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is what donors and volunteers see for {profile.orgName}. Changes here don&rsquo;t affect your
          approval status.
        </p>
      </div>

      <form onSubmit={submit} className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-5">
        <PhotoUploadField label="Organization logo" value={logoFile} onChange={setLogoFile} currentUrl={profile.logoUrl} />

        <Accordion type="multiple" defaultValue={['Basic details']} className="space-y-3">
        <Section emoji="🏢" title="Basic details" subtitle="Name, about and contact">
          <label className="block">
            <span className="eyebrow">Organization name</span>
            <Input maxLength={120} required value={form.orgName} onChange={set('orgName')} className="mt-2 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="eyebrow">About your organization</span>
            <Textarea maxLength={2000} required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">Website (optional)</span>
              <Input maxLength={300}
                value={form.website}
                onChange={set('website')}
                onBlur={() => setWebsiteTouched(true)}
                placeholder="https://"
                className="mt-2 h-11 rounded-full"
              />
              {websiteError && <p className="mt-1 text-xs text-destructive">{websiteError}</p>}
            </label>
            <label className="block">
              <span className="eyebrow">Phone (optional)</span>
              <PhoneInput
                value={form.contactPhone}
                onChange={(digits) => setForm((s) => ({ ...s, contactPhone: digits }))}
                onBlur={() => setPhoneTouched(true)}
              />
              {phoneField.error && <p className="mt-1 text-xs text-destructive">{phoneField.error}</p>}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="eyebrow">City</span>
              <CitySelect value={form.city} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
            </label>
            <label className="block">
              <span className="eyebrow">Founded year</span>
              <Input type="number" value={form.foundedYear} onChange={set('foundedYear')} className="mt-2 h-11 rounded-full" />
            </label>
            <label className="block">
              <span className="eyebrow">Volunteers (approx.)</span>
              <Input type="number" value={form.volunteerCountEstimate} onChange={set('volunteerCountEstimate')} className="mt-2 h-11 rounded-full" />
            </label>
          </div>
        </Section>

        <Section emoji="🏆" title="Awards & recognition" subtitle="Honours your organisation has received">
          <div>
            <div className="space-y-2.5">
              {form.awards.map((award, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Award {i + 1}</span>
                    <button type="button" onClick={() => removeAward(i)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2">
                    <Input maxLength={200}
                      placeholder="Award title"
                      value={award.title}
                      onChange={(e) => updateAward(i, { title: e.target.value })}
                      className="h-10 rounded-full"
                    />
                    <Input
                      type="number"
                      placeholder="Year"
                      value={award.year}
                      onChange={(e) => updateAward(i, { year: e.target.value })}
                      className="h-10 rounded-full"
                    />
                  </div>
                  <Input maxLength={200}
                    placeholder="Issuer (optional)"
                    value={award.issuer}
                    onChange={(e) => updateAward(i, { issuer: e.target.value })}
                    className="h-10 rounded-full"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addAward}>
                <Plus className="h-3.5 w-3.5" /> Add award
              </Button>
            </div>
          </div>
        </Section>

        <Section emoji="📍" title="Organisation & address" subtitle="Type, address, where you operate">
          {legalLocked ? (
            <Field label="Organisation type">
              <input disabled value={ORG_TYPE_OPTIONS.find((o) => o.value === form.orgType)?.label ?? ''} className={inputClass} />
            </Field>
          ) : (
            <ChipSelect label="Organisation type" options={ORG_TYPE_OPTIONS} value={form.orgType} onChange={setField('orgType')} />
          )}
          <Field label="Full registered address">
            <textarea maxLength={300} rows={2} value={form.line1} onChange={set('line1')} className={textareaClass} />
          </Field>
          <ChipListInput label="Cities you operate in" placeholder="Add a city" values={form.operatingCities} onChange={setField('operatingCities')} />
          <ChipListInput label="States you operate in" placeholder="Add a state / UT" values={form.operatingStates} onChange={setField('operatingStates')} />
          <Field label="Official email">
            <input type="email" maxLength={254} value={form.officialEmail} onChange={set('officialEmail')} className={inputClass} />
          </Field>
          <ChipListInput label="Social media links" placeholder="Paste a link" values={form.socialMediaLinks} onChange={setField('socialMediaLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
        </Section>

        <Section emoji="📄" title="Registration & legal" subtitle="PAN and registration numbers">
          {legalLocked && (
            <p className="text-xs text-muted-foreground">
              These were verified when your account was approved, so they can&rsquo;t be edited here. Contact support if something needs to change.
            </p>
          )}
          <Field label="PAN of organisation">
            <input maxLength={20} value={form.panNumber} onChange={set('panNumber')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="Registration number">
            <input maxLength={80} value={form.registrationNumber} onChange={set('registrationNumber')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="Registration authority">
            <input maxLength={120} value={form.registrationAuthority} onChange={set('registrationAuthority')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="NGO Darpan ID">
            <input maxLength={40} value={form.ngoDarpanId} onChange={set('ngoDarpanId')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="12A / 12AB registration number">
            <input maxLength={60} value={form.twelveARegistrationNumber} onChange={set('twelveARegistrationNumber')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="80G registration number">
            <input maxLength={60} value={form.eightyGRegistrationNumber} onChange={set('eightyGRegistrationNumber')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="FCRA registration number">
            <input maxLength={60} value={form.fcraRegistrationNumber} onChange={set('fcraRegistrationNumber')} className={inputClass} {...lockedProps} />
          </Field>
          <Field label="CSR-1 registration number">
            <input maxLength={60} value={form.csr1RegistrationNumber} onChange={set('csr1RegistrationNumber')} className={inputClass} {...lockedProps} />
          </Field>
        </Section>

        <Section emoji="👥" title="People behind the organisation" subtitle="Primary contact and office bearers">
          <Field label="Primary contact's full name">
            <input maxLength={120} value={form.primaryContactName} onChange={set('primaryContactName')} className={inputClass} />
          </Field>
          <Field label="Designation">
            <input maxLength={80} value={form.primaryContactDesignation} onChange={set('primaryContactDesignation')} className={inputClass} />
          </Field>
          <Field label="Primary contact's phone">
            <PhoneInput value={form.primaryContactPhone} onChange={setField('primaryContactPhone')} />
          </Field>
          <Field label="Primary contact's email">
            <input type="email" maxLength={254} value={form.primaryContactEmail} onChange={set('primaryContactEmail')} className={inputClass} />
          </Field>
          {legalLocked ? (
            form.officeBearers.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                <span className="eyebrow">Office bearers</span>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {form.officeBearers.map((b, i) => (
                    <li key={i}>
                      {b.name}
                      {b.designation ? ` · ${b.designation}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : (
            <OfficeBearerRepeater bearers={form.officeBearers} onChange={setField('officeBearers')} />
          )}
        </Section>

        <Section emoji="🌍" title="What you do" subtitle="Areas of work and track record">
          <ChipSelect multi label="Primary areas of work" options={WORK_AREA_OPTIONS} value={form.primaryWorkAreas} onChange={setField('primaryWorkAreas')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Plantation drives conducted">
              <input type="number" value={form.drivesConductedHistorical} onChange={set('drivesConductedHistorical')} className={inputClass} />
            </Field>
            <Field label="Trees planted historically">
              <input type="number" value={form.treesPlantedHistorical} onChange={set('treesPlantedHistorical')} className={inputClass} />
            </Field>
          </div>
          <Field label="Major projects / campaigns">
            <textarea maxLength={2000} rows={3} value={form.majorProjectsDescription} onChange={set('majorProjectsDescription')} className={textareaClass} />
          </Field>
          <Field label="Doing environmental work since (year)">
            <input type="number" value={form.environmentalWorkSinceYear} onChange={set('environmentalWorkSinceYear')} className={inputClass} />
          </Field>
        </Section>

        <Section emoji="🌱" title="Plantation work" subtitle="How you run your drives">
          <ToggleRow label="We currently conduct plantation drives" checked={form.conductsPlantationDrives} onChange={setField('conductsPlantationDrives')} />
          <ChipSelect label="Typical saplings per drive" options={SAPLINGS_PER_DRIVE_OPTIONS} value={form.typicalSaplingsPerDrive} onChange={setField('typicalSaplingsPerDrive')} />
          <Field label="Typical drive locations">
            <input maxLength={300} value={form.typicalDriveLocations} onChange={set('typicalDriveLocations')} className={inputClass} />
          </Field>
          <Field label="Species commonly planted">
            <input maxLength={300} value={form.speciesCommonlyPlanted} onChange={set('speciesCommonlyPlanted')} className={inputClass} />
          </Field>
          <Field label="How do you verify trees were actually planted?">
            <textarea maxLength={500} rows={2} value={form.plantationVerificationMethod} onChange={set('plantationVerificationMethod')} className={textareaClass} />
          </Field>
          <Field label="Where do you source saplings from?">
            <textarea maxLength={500} rows={2} value={form.saplingSourceDescription} onChange={set('saplingSourceDescription')} className={textareaClass} />
          </Field>
          <ToggleRow label="We monitor survival post-planting" checked={form.monitorsSurvivalPostPlanting} onChange={setField('monitorsSurvivalPostPlanting')} />
          <ToggleRow label="We do post-plantation maintenance" checked={form.doesPostPlantationMaintenance} onChange={setField('doesPostPlantationMaintenance')} />
        </Section>

        <Section emoji="🔗" title="Supporting links" subtitle="Reports, media and project pages">
          {[
            ['previousProjectLinks', 'Previous projects'],
            ['driveReportLinks', 'Plantation drive reports'],
            ['mediaCoverageLinks', 'Newspaper / media coverage'],
            ['projectPageLinks', 'Website / project pages'],
            ['annualReportLinks', 'Annual reports'],
            ['impactReportLinks', 'Impact reports'],
            ['socialMediaPostLinks', 'Social media posts'],
          ].map(([key, label]) => (
            <ChipListInput key={key} label={label} placeholder="Paste a link" values={form[key]} onChange={setField(key)} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
          ))}
        </Section>

        <Section emoji="🎯" title="Using ARTH" subtitle="Goals and who takes part">
          <ChipSelect multi label="What would you like to use ARTH for?" options={ARTH_USAGE_OPTIONS} value={form.arthUsageGoals} onChange={setField('arthUsageGoals')} />
          <Field label="Expected plantation drives per year via ARTH">
            <input type="number" value={form.expectedDrivesPerYear} onChange={set('expectedDrivesPerYear')} className={inputClass} />
          </Field>
          <ChipSelect multi label="Who typically participates in your drives?" options={PARTICIPANT_TYPE_OPTIONS} value={form.participantTypes} onChange={setField('participantTypes')} />
        </Section>
        </Accordion>

        <Button disabled={submitting || (form.contactPhone && !phoneField.isOk) || Boolean(websiteError)} type="submit" className="rounded-full h-11">
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </DashboardPageShell>
  )
}

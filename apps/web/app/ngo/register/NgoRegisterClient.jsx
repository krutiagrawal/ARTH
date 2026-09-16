'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sprout } from 'lucide-react'
import PhoneInput from '@/components/dashboard/PhoneInput'
import CitySelect from '@/components/dashboard/CitySelect'
import ChipSelect from '@/components/forms/ChipSelect'
import ChipListInput from '@/components/forms/ChipListInput'
import FileUploadInput from '@/components/forms/FileUploadInput'
import MultiFileUploadInput from '@/components/forms/MultiFileUploadInput'
import OfficeBearerRepeater from '@/components/forms/OfficeBearerRepeater'
import StepWizardShell from '@/components/forms/StepWizardShell'
import { useEmailField } from '@/lib/useEmailField'
import { usePhoneField } from '@/lib/usePhoneField'
import { isValidWebsite, isValidPhone, isValidEmail } from '@/lib/validation'

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

const STEPS = ['orgIdentity', 'addressContact', 'legalRegistrations', 'people', 'whatYouDo', 'plantationPractices', 'proofOfWork', 'arthGoals', 'account']

const STEP_COPY = {
  orgIdentity: { emoji: '🏢', title: 'Your organisation', subtitle: 'The basics — who you are, legally.' },
  addressContact: { emoji: '📍', title: 'Where you work', subtitle: 'Registered address and how people can reach you.' },
  legalRegistrations: { emoji: '📄', title: 'Registrations you hold', subtitle: "Optional — add whichever apply. Don't worry if you don't have all of these yet." },
  people: { emoji: '👥', title: 'People behind the org', subtitle: 'Who represents this NGO, and proof you’re authorised to.' },
  whatYouDo: { emoji: '🌍', title: 'What you do', subtitle: 'Help us understand your work.' },
  plantationPractices: { emoji: '🌱', title: 'Your plantation practices', subtitle: 'This is where we tell a real plantation org from one that just claims to be.' },
  proofOfWork: { emoji: '📸', title: 'Show us your work', subtitle: 'Photos and links from past activities — not all mandatory.' },
  arthGoals: { emoji: '🎯', title: 'Using ARTH', subtitle: 'What would you like to do on ARTH?' },
  account: { emoji: '🔐', title: 'Create your login', subtitle: "Last step — you're almost in." },
}

const initialForm = {
  orgName: '',
  orgType: null,
  foundedYear: '',

  line1: '',
  city: 'Pune',
  operatingCities: [],
  operatingStates: [],
  officialEmail: '',
  officialPhone: '',
  website: '',
  socialMediaLinks: [],

  hasRegistration: false,
  registrationNumber: '',
  registrationAuthority: '',
  registrationCertificate: null,
  panNumber: '',
  hasDarpan: false,
  ngoDarpanId: '',
  has12A: false,
  twelveARegistrationNumber: '',
  twelveACertificate: null,
  has80G: false,
  eightyGRegistrationNumber: '',
  eightyGCertificate: null,
  hasFcra: false,
  fcraRegistrationNumber: '',
  fcraCertificate: null,
  hasCsr1: false,
  csr1RegistrationNumber: '',
  csr1Certificate: null,

  primaryContactName: '',
  primaryContactDesignation: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  officeBearers: [],
  authorizationProof: null,

  description: '',
  primaryWorkAreas: [],
  drivesConductedHistorical: '',
  treesPlantedHistorical: '',
  volunteerCountEstimate: '',
  majorProjectsDescription: '',
  environmentalWorkSinceYear: '',

  conductsPlantationDrives: false,
  typicalSaplingsPerDrive: null,
  typicalDriveLocations: '',
  speciesCommonlyPlanted: '',
  saplingSourceDescription: '',
  monitorsSurvivalPostPlanting: false,
  doesPostPlantationMaintenance: false,
  plantationVerificationMethod: '',
  previousProjectLinks: [],

  pastWorkPhotos: [],
  driveReportLinks: [],
  mediaCoverageLinks: [],
  projectPageLinks: [],
  annualReportLinks: [],
  impactReportLinks: [],
  socialMediaPostLinks: [],

  arthUsageGoals: [],
  expectedDrivesPerYear: '',
  participantTypes: [],

  name: '',
  handle: '',
  email: '',
  password: '',
}

function slugifyHandle(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'ngo'
  )
}

function ConfirmationView({ orgName }) {
  return (
    <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sprout className="h-6 w-6" />
      </span>
      <h2 className="font-serif text-2xl md:text-3xl mt-6">Thank you, {orgName}. 🌱</h2>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Your application has been submitted, and it&rsquo;s now in front of our team. We read every one closely –
        expect to hear from us soon, and we&rsquo;ll email you the moment there&rsquo;s a decision. We&rsquo;re
        grateful you want to grow this with us.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/ngo/dashboard" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
          Go to your dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full px-5 h-11 text-sm text-muted-foreground hover:text-foreground transition">
          Back to home
        </Link>
      </div>
    </div>
  )
}

function buildFormData(form) {
  const data = new FormData()

  const scalar = {
    email: form.email.trim().toLowerCase(),
    password: form.password,
    name: form.primaryContactName.trim() || form.orgName.trim(),
    handle: slugifyHandle(form.orgName),
    orgName: form.orgName.trim(),
    description: form.description.trim(),
    orgType: form.orgType || undefined,
    foundedYear: form.foundedYear.trim() || undefined,
    line1: form.line1.trim() || undefined,
    city: form.city.trim() || undefined,
    website: form.website.trim() || undefined,
    officialEmail: form.officialEmail.trim() || undefined,
    contactPhone: form.officialPhone || undefined,
    registrationNumber: form.hasRegistration ? form.registrationNumber.trim() || undefined : undefined,
    registrationAuthority: form.hasRegistration ? form.registrationAuthority.trim() || undefined : undefined,
    panNumber: form.panNumber.trim() || undefined,
    ngoDarpanId: form.hasDarpan ? form.ngoDarpanId.trim() || undefined : undefined,
    twelveARegistrationNumber: form.has12A ? form.twelveARegistrationNumber.trim() || undefined : undefined,
    eightyGRegistrationNumber: form.has80G ? form.eightyGRegistrationNumber.trim() || undefined : undefined,
    fcraRegistrationNumber: form.hasFcra ? form.fcraRegistrationNumber.trim() || undefined : undefined,
    csr1RegistrationNumber: form.hasCsr1 ? form.csr1RegistrationNumber.trim() || undefined : undefined,
    primaryContactName: form.primaryContactName.trim() || undefined,
    primaryContactDesignation: form.primaryContactDesignation.trim() || undefined,
    primaryContactPhone: form.primaryContactPhone || undefined,
    primaryContactEmail: form.primaryContactEmail.trim() || undefined,
    drivesConductedHistorical: form.drivesConductedHistorical.trim() || undefined,
    treesPlantedHistorical: form.treesPlantedHistorical.trim() || undefined,
    volunteerCountEstimate: form.volunteerCountEstimate.trim() || undefined,
    majorProjectsDescription: form.majorProjectsDescription.trim() || undefined,
    environmentalWorkSinceYear: form.environmentalWorkSinceYear.trim() || undefined,
    conductsPlantationDrives: String(form.conductsPlantationDrives),
    typicalSaplingsPerDrive: SAPLINGS_PER_DRIVE_OPTIONS.find((o) => o.value === form.typicalSaplingsPerDrive)?.label,
    typicalDriveLocations: form.typicalDriveLocations.trim() || undefined,
    speciesCommonlyPlanted: form.speciesCommonlyPlanted.trim() || undefined,
    saplingSourceDescription: form.saplingSourceDescription.trim() || undefined,
    monitorsSurvivalPostPlanting: String(form.monitorsSurvivalPostPlanting),
    doesPostPlantationMaintenance: String(form.doesPostPlantationMaintenance),
    plantationVerificationMethod: form.plantationVerificationMethod.trim() || undefined,
    expectedDrivesPerYear: form.expectedDrivesPerYear.trim() || undefined,
    deviceInfo: 'web',
  }
  Object.entries(scalar).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') data.append(key, value)
  })

  const commaLists = {
    operatingCities: form.operatingCities,
    operatingStates: form.operatingStates,
    primaryWorkAreas: form.primaryWorkAreas,
    arthUsageGoals: form.arthUsageGoals,
    participantTypes: form.participantTypes,
  }
  Object.entries(commaLists).forEach(([key, list]) => {
    if (list.length) data.append(key, list.join(','))
  })

  const jsonLists = {
    socialMediaLinks: form.socialMediaLinks,
    officeBearers: form.officeBearers.filter((b) => b.name.trim()),
    previousProjectLinks: form.previousProjectLinks,
    driveReportLinks: form.driveReportLinks,
    mediaCoverageLinks: form.mediaCoverageLinks,
    projectPageLinks: form.projectPageLinks,
    annualReportLinks: form.annualReportLinks,
    impactReportLinks: form.impactReportLinks,
    socialMediaPostLinks: form.socialMediaPostLinks,
  }
  Object.entries(jsonLists).forEach(([key, list]) => {
    if (list.length) data.append(key, JSON.stringify(list))
  })

  const documents = {
    registrationCertificate: form.hasRegistration ? form.registrationCertificate : null,
    twelveACertificate: form.has12A ? form.twelveACertificate : null,
    eightyGCertificate: form.has80G ? form.eightyGCertificate : null,
    fcraCertificate: form.hasFcra ? form.fcraCertificate : null,
    csr1Certificate: form.hasCsr1 ? form.csr1Certificate : null,
    authorizationProof: form.authorizationProof,
  }
  Object.entries(documents).forEach(([key, file]) => {
    if (file) data.append(key, file)
  })
  form.pastWorkPhotos.forEach((file) => data.append('pastWorkPhotos', file))

  return data
}

function NgoRegisterForm() {
  const [form, setForm] = useState(initialForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedOrgName, setSubmittedOrgName] = useState(null)
  const [websiteTouched, setWebsiteTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const emailField = useEmailField(form.email, emailTouched)
  const step = STEPS[stepIndex]

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))
  const setField = (key) => (value) => setForm((s) => ({ ...s, [key]: value }))

  const validateStep = (s) => {
    switch (s) {
      case 'orgIdentity':
        if (!form.orgName.trim()) return 'Enter your organisation name'
        if (!form.orgType) return 'Pick the legal structure that describes your organisation'
        return null
      case 'addressContact':
        if (!form.line1.trim()) return 'Add your registered address'
        if (!form.city.trim()) return 'Pick a city'
        if (form.operatingCities.length === 0) return 'Add at least one city you operate in'
        if (!isValidPhone(form.officialPhone)) return 'Enter a valid 10-digit official phone number'
        if (form.officialEmail.trim() && !isValidEmail(form.officialEmail)) return 'Enter a valid official email, or leave it blank'
        if (form.website.trim() && !isValidWebsite(form.website)) {
          setWebsiteTouched(true)
          return 'Enter a valid website URL'
        }
        return null
      case 'legalRegistrations':
        return null
      case 'people':
        if (!form.primaryContactName.trim()) return "Enter the primary contact's name"
        if (!isValidPhone(form.primaryContactPhone)) return "Enter a valid 10-digit phone for the primary contact"
        if (!form.authorizationProof) return "Upload proof that you're authorised to represent this NGO"
        return null
      case 'whatYouDo':
        if (!form.description.trim()) return 'Tell us what your organisation does'
        if (form.primaryWorkAreas.length === 0) return 'Pick at least one area of work'
        return null
      case 'plantationPractices':
        return null
      case 'proofOfWork':
        return null
      case 'arthGoals':
        if (form.arthUsageGoals.length === 0) return 'Pick at least one way you’d like to use ARTH'
        return null
      case 'account':
        if (!form.email.trim() || !emailField.isOk) {
          setEmailTouched(true)
          return emailField.error || 'Enter a valid email address'
        }
        if (form.password.length < 8) return 'Password must be at least 8 characters'
        return null
      default:
        return null
    }
  }

  const goNext = async () => {
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError('')
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ngo/register', { method: 'POST', body: buildFormData(form) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setSubmittedOrgName(form.orgName)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    setError('')
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  if (submittedOrgName) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <ConfirmationView orgName={submittedOrgName} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <p className="eyebrow text-primary">Register your organization</p>
      <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
        Bring your NGO to <em className="italic text-primary">ARTH</em>.
      </h1>
      <p className="mt-4 text-muted-foreground max-w-md">
        Organise drives, onboard participants, receive donations, and represent your plantation projects. An ARTH
        admin reviews every application before it goes live.
      </p>

      <StepWizardShell
        stepIndex={stepIndex}
        stepCount={STEPS.length}
        emoji={STEP_COPY[step].emoji}
        title={STEP_COPY[step].title}
        subtitle={STEP_COPY[step].subtitle}
        error={error}
        onBack={goBack}
        onNext={goNext}
        nextLabel={step === 'account' ? 'Submit application' : 'Continue'}
        submitting={submitting}
      >
        {step === 'orgIdentity' && (
          <>
            <label className="block">
              <span className="eyebrow">Organisation name</span>
              <input value={form.orgName} onChange={set('orgName')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <ChipSelect label="Organisation type" options={ORG_TYPE_OPTIONS} value={form.orgType} onChange={setField('orgType')} />
            <label className="block">
              <span className="eyebrow">Year established (optional)</span>
              <input value={form.foundedYear} onChange={set('foundedYear')} type="number" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
          </>
        )}

        {step === 'addressContact' && (
          <>
            <label className="block">
              <span className="eyebrow">Full registered address</span>
              <textarea rows={2} value={form.line1} onChange={set('line1')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">City</span>
              <CitySelect value={form.city} onChange={setField('city')} />
            </label>
            <ChipListInput label="Cities you operate in" placeholder="Add a city" values={form.operatingCities} onChange={setField('operatingCities')} />
            <ChipListInput label="States you operate in (optional)" placeholder="Add a state" values={form.operatingStates} onChange={setField('operatingStates')} />
            <label className="block">
              <span className="eyebrow">Official phone number</span>
              <PhoneInput value={form.officialPhone} onChange={setField('officialPhone')} />
            </label>
            <label className="block">
              <span className="eyebrow">Official email (optional)</span>
              <input type="email" value={form.officialEmail} onChange={set('officialEmail')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Website (optional)</span>
              <input
                value={form.website}
                onChange={set('website')}
                onBlur={() => setWebsiteTouched(true)}
                placeholder="https://"
                className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
              />
              {websiteTouched && form.website.trim() && !isValidWebsite(form.website) && <p className="mt-1 text-xs text-destructive">Enter a valid website URL</p>}
            </label>
            <ChipListInput
              label="Social media links (optional)"
              placeholder="Paste a link"
              values={form.socialMediaLinks}
              onChange={setField('socialMediaLinks')}
              validate={isValidWebsite}
              validationHint="Doesn't look like a valid link"
            />
          </>
        )}

        {step === 'legalRegistrations' && (
          <>
            <label className="block">
              <span className="eyebrow">PAN of organisation (optional)</span>
              <input value={form.panNumber} onChange={set('panNumber')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>

            <RegistrationToggle label="We have a registration certificate" checked={form.hasRegistration} onChange={setField('hasRegistration')} />
            {form.hasRegistration && (
              <div className="space-y-3 pl-1">
                <input value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="Registration number" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <input value={form.registrationAuthority} onChange={set('registrationAuthority')} placeholder="Registration authority" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <FileUploadInput label="Registration certificate" hint="PDF or photo" file={form.registrationCertificate} onChange={setField('registrationCertificate')} />
              </div>
            )}

            <RegistrationToggle label="We're registered on NGO Darpan" checked={form.hasDarpan} onChange={setField('hasDarpan')} />
            {form.hasDarpan && (
              <input value={form.ngoDarpanId} onChange={set('ngoDarpanId')} placeholder="NGO Darpan ID" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            )}

            <RegistrationToggle label="We have 12A / 12AB registration" checked={form.has12A} onChange={setField('has12A')} />
            {form.has12A && (
              <div className="space-y-3 pl-1">
                <input value={form.twelveARegistrationNumber} onChange={set('twelveARegistrationNumber')} placeholder="12A/12AB registration number" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <FileUploadInput label="12A/12AB certificate" hint="PDF or photo" file={form.twelveACertificate} onChange={setField('twelveACertificate')} />
              </div>
            )}

            <RegistrationToggle label="We have 80G registration" checked={form.has80G} onChange={setField('has80G')} />
            {form.has80G && (
              <div className="space-y-3 pl-1">
                <input value={form.eightyGRegistrationNumber} onChange={set('eightyGRegistrationNumber')} placeholder="80G registration number" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <FileUploadInput label="80G certificate" hint="PDF or photo" file={form.eightyGCertificate} onChange={setField('eightyGCertificate')} />
              </div>
            )}

            <RegistrationToggle label="We have FCRA registration" checked={form.hasFcra} onChange={setField('hasFcra')} />
            {form.hasFcra && (
              <div className="space-y-3 pl-1">
                <input value={form.fcraRegistrationNumber} onChange={set('fcraRegistrationNumber')} placeholder="FCRA registration number" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <FileUploadInput label="FCRA certificate" hint="PDF or photo" file={form.fcraCertificate} onChange={setField('fcraCertificate')} />
              </div>
            )}

            <RegistrationToggle label="We have CSR-1 registration" checked={form.hasCsr1} onChange={setField('hasCsr1')} />
            {form.hasCsr1 && (
              <div className="space-y-3 pl-1">
                <input value={form.csr1RegistrationNumber} onChange={set('csr1RegistrationNumber')} placeholder="CSR-1 registration number" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <FileUploadInput label="CSR-1 certificate" hint="PDF or photo" file={form.csr1Certificate} onChange={setField('csr1Certificate')} />
              </div>
            )}

            <p className="text-xs text-muted-foreground">None of these are mandatory — add whichever you have to help us approve you faster.</p>
          </>
        )}

        {step === 'people' && (
          <>
            <label className="block">
              <span className="eyebrow">Primary contact&rsquo;s full name</span>
              <input value={form.primaryContactName} onChange={set('primaryContactName')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Designation</span>
              <input value={form.primaryContactDesignation} onChange={set('primaryContactDesignation')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Primary contact&rsquo;s phone</span>
              <PhoneInput value={form.primaryContactPhone} onChange={setField('primaryContactPhone')} />
            </label>
            <label className="block">
              <span className="eyebrow">Primary contact&rsquo;s email (optional)</span>
              <input type="email" value={form.primaryContactEmail} onChange={set('primaryContactEmail')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <OfficeBearerRepeater bearers={form.officeBearers} onChange={setField('officeBearers')} />
            <FileUploadInput
              label="Proof you're authorised to represent this NGO"
              hint="Board resolution, authorisation letter, or similar — PDF or photo"
              file={form.authorizationProof}
              onChange={setField('authorizationProof')}
            />
          </>
        )}

        {step === 'whatYouDo' && (
          <>
            <label className="block">
              <span className="eyebrow">Brief description of your organisation</span>
              <textarea rows={4} value={form.description} onChange={set('description')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <ChipSelect multi label="Primary areas of work" options={WORK_AREA_OPTIONS} value={form.primaryWorkAreas} onChange={setField('primaryWorkAreas')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Plantation drives conducted (optional)</span>
                <input type="number" value={form.drivesConductedHistorical} onChange={set('drivesConductedHistorical')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <label className="block">
                <span className="eyebrow">Trees planted historically (optional)</span>
                <input type="number" value={form.treesPlantedHistorical} onChange={set('treesPlantedHistorical')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
            </div>
            <label className="block">
              <span className="eyebrow">Approx. active volunteers (optional)</span>
              <input type="number" value={form.volunteerCountEstimate} onChange={set('volunteerCountEstimate')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Major projects / campaigns (optional)</span>
              <textarea rows={3} value={form.majorProjectsDescription} onChange={set('majorProjectsDescription')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Conducting environmental work since (year, optional)</span>
              <input type="number" value={form.environmentalWorkSinceYear} onChange={set('environmentalWorkSinceYear')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
          </>
        )}

        {step === 'plantationPractices' && (
          <>
            <RegistrationToggle label="We currently conduct plantation drives" checked={form.conductsPlantationDrives} onChange={setField('conductsPlantationDrives')} />
            {form.conductsPlantationDrives && (
              <div className="space-y-4 pl-1">
                <ChipSelect label="Typical saplings per drive" options={SAPLINGS_PER_DRIVE_OPTIONS} value={form.typicalSaplingsPerDrive} onChange={setField('typicalSaplingsPerDrive')} />
                <input value={form.typicalDriveLocations} onChange={set('typicalDriveLocations')} placeholder="Typical drive locations" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <input value={form.speciesCommonlyPlanted} onChange={set('speciesCommonlyPlanted')} placeholder="Species commonly planted" className="w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                <textarea rows={2} value={form.saplingSourceDescription} onChange={set('saplingSourceDescription')} placeholder="Where do you source saplings from?" className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
                <RegistrationToggle label="We monitor survival post-planting" checked={form.monitorsSurvivalPostPlanting} onChange={setField('monitorsSurvivalPostPlanting')} />
                <RegistrationToggle label="We do post-plantation maintenance" checked={form.doesPostPlantationMaintenance} onChange={setField('doesPostPlantationMaintenance')} />
                <textarea rows={2} value={form.plantationVerificationMethod} onChange={set('plantationVerificationMethod')} placeholder="How do you verify trees were actually planted?" className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
                <ChipListInput
                  label="Links to previous projects (optional)"
                  placeholder="Paste a link"
                  values={form.previousProjectLinks}
                  onChange={setField('previousProjectLinks')}
                  validate={isValidWebsite}
                  validationHint="Doesn't look like a valid link"
                />
              </div>
            )}
          </>
        )}

        {step === 'proofOfWork' && (
          <>
            <MultiFileUploadInput label="Photos of previous plantation activities" hint="Optional — up to 5" files={form.pastWorkPhotos} onChange={setField('pastWorkPhotos')} max={5} />
            <ChipListInput label="Plantation drive reports (optional)" placeholder="Paste a link" values={form.driveReportLinks} onChange={setField('driveReportLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            <ChipListInput label="Newspaper/media coverage (optional)" placeholder="Paste a link" values={form.mediaCoverageLinks} onChange={setField('mediaCoverageLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            <ChipListInput label="Website/project pages (optional)" placeholder="Paste a link" values={form.projectPageLinks} onChange={setField('projectPageLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            <ChipListInput label="Annual reports (optional)" placeholder="Paste a link" values={form.annualReportLinks} onChange={setField('annualReportLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            <ChipListInput label="Impact reports (optional)" placeholder="Paste a link" values={form.impactReportLinks} onChange={setField('impactReportLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
            <ChipListInput label="Social media posts (optional)" placeholder="Paste a link" values={form.socialMediaPostLinks} onChange={setField('socialMediaPostLinks')} validate={isValidWebsite} validationHint="Doesn't look like a valid link" />
          </>
        )}

        {step === 'arthGoals' && (
          <>
            <ChipSelect multi label="What would you like to use ARTH for?" options={ARTH_USAGE_OPTIONS} value={form.arthUsageGoals} onChange={setField('arthUsageGoals')} />
            <label className="block">
              <span className="eyebrow">Expected plantation drives per year via ARTH (optional)</span>
              <input type="number" value={form.expectedDrivesPerYear} onChange={set('expectedDrivesPerYear')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <ChipSelect multi label="Who typically participates in your drives?" options={PARTICIPANT_TYPE_OPTIONS} value={form.participantTypes} onChange={setField('participantTypes')} />
          </>
        )}

        {step === 'account' && (
          <>
            <label className="block">
              <span className="eyebrow">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onBlur={() => setEmailTouched(true)}
                className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
              />
              {emailField.checking && <p className="mt-1 text-xs text-muted-foreground">Checking…</p>}
              {emailField.error && <p className="mt-1 text-xs text-destructive">{emailField.error}</p>}
            </label>
            <label className="block">
              <span className="eyebrow">Password</span>
              <input type="password" minLength={8} value={form.password} onChange={set('password')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <p className="text-xs text-muted-foreground">Your application will be reviewed before you can publish drives, campaigns, or receive donations.</p>
          </>
        )}
      </StepWizardShell>

      {stepIndex === 0 && (
        <p className="mt-4 text-xs text-center text-muted-foreground">
          Already registered? <Link href="/ngo/login" className="text-primary">Sign in</Link>
        </p>
      )}
    </div>
  )
}

function RegistrationToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-primary" />
    </label>
  )
}

export default function NgoRegisterClient() {
  return (
    <Suspense fallback={null}>
      <NgoRegisterForm />
    </Suspense>
  )
}

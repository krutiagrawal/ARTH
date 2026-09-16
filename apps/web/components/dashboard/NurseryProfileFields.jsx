'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PhoneInput from '@/components/dashboard/PhoneInput'
import { isValidGstin } from '@/lib/validation'
import {
  NURSERY_TYPE_OPTIONS,
  PLANT_CATEGORY_OPTIONS,
  PLANT_COUNT_LABELS,
  RESPONSIBLE_ROLE_PRESETS,
} from '@/lib/nurseryOptions'

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-4 cursor-pointer">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-border/70" />
    </label>
  )
}

/**
 * The nursery-profile "extended" fields (identity, responsible person, stock, business
 * verification) — everything the backend's updateNurseryProfileSchema accepts beyond the
 * original nurseryName/description/city/contactPhone/followPolicy set. Shared between the main
 * Settings page and the rejected-application resubmit panel so the field set/behaviour never
 * drifts between the two.
 *
 * `form`/`setForm` follow the same `setForm((s) => ({ ...s, key: value }))` convention used
 * throughout this codebase's nursery dashboard forms. `responsiblePersonPhone` validation is left
 * to the caller (same pattern as `contactPhone` elsewhere) — pass `responsiblePhoneError` and
 * `onResponsiblePhoneBlur` so the "touched" state lives in the parent alongside its own submit
 * gating.
 */
export default function NurseryProfileFields({ form, setForm, responsiblePhoneError, onResponsiblePhoneBlur }) {
  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const toggleCategory = (value) =>
    setForm((s) => {
      const current = s.plantCategories || []
      return {
        ...s,
        plantCategories: current.includes(value) ? current.filter((c) => c !== value) : [...current, value],
      }
    })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Year established</span>
            <Input
              type="number"
              min="1800"
              max="2100"
              placeholder="e.g. 2010"
              value={form.yearEstablished}
              onChange={set('yearEstablished')}
              className="mt-1 h-11 rounded-full"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Nursery type</span>
            <Select value={form.nurseryType || undefined} onValueChange={(v) => setForm((s) => ({ ...s, nurseryType: v }))}>
              <SelectTrigger className="mt-1 h-11 rounded-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {NURSERY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-muted-foreground">Website (optional)</span>
          <Input
            type="text"
            placeholder="https://yournursery.example"
            value={form.websiteUrl}
            onChange={set('websiteUrl')}
            className="mt-1 h-11 rounded-full"
          />
        </label>
      </div>

      <div className="space-y-3">
        <p className="eyebrow">Responsible person</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Full name</span>
            <Input value={form.responsiblePersonName} onChange={set('responsiblePersonName')} className="mt-1 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Phone</span>
            <PhoneInput
              value={form.responsiblePersonPhone}
              onChange={(digits) => setForm((s) => ({ ...s, responsiblePersonPhone: digits }))}
              onBlur={onResponsiblePhoneBlur}
            />
            {responsiblePhoneError && <p className="mt-1 text-xs text-destructive">{responsiblePhoneError}</p>}
          </label>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Role</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {RESPONSIBLE_ROLE_PRESETS.map((role) => (
              <Pill key={role} active={form.responsiblePersonRole === role} onClick={() => setForm((s) => ({ ...s, responsiblePersonRole: role }))}>
                {role}
              </Pill>
            ))}
          </div>
          <Input
            placeholder="Or type a custom role, e.g. Site supervisor"
            value={form.responsiblePersonRole}
            onChange={set('responsiblePersonRole')}
            className="mt-2 h-11 rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="eyebrow">Stock</p>
        <div>
          <span className="text-xs text-muted-foreground">What do you stock?</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PLANT_CATEGORY_OPTIONS.map((opt) => (
              <Pill key={opt.value} active={(form.plantCategories || []).includes(opt.value)} onClick={() => toggleCategory(opt.value)}>
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Approximately how many plants do you have?</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PLANT_COUNT_LABELS.map((label) => (
              <Pill key={label} active={form.approxPlantCount === label} onClick={() => setForm((s) => ({ ...s, approxPlantCount: label }))}>
                {label}
              </Pill>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow
            label="🍂 Availability changes by season"
            checked={Boolean(form.seasonalAvailability)}
            onChange={(v) => setForm((s) => ({ ...s, seasonalAvailability: v }))}
          />
          <ToggleRow
            label="📦 Can supply bulk quantities"
            checked={Boolean(form.bulkSupply)}
            onChange={(v) => setForm((s) => ({ ...s, bulkSupply: v }))}
          />
        </div>
      </div>

      <details className="rounded-2xl border border-border/60 bg-secondary/20 p-4 group">
        <summary className="cursor-pointer text-sm font-medium select-none">Business verification (optional)</summary>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">GSTIN</span>
            <Input
              value={form.gstin}
              onChange={set('gstin')}
              autoCapitalize="characters"
              className="mt-1 h-11 rounded-full"
            />
            {form.gstin?.trim() && !isValidGstin(form.gstin) && <p className="mt-1 text-xs text-destructive">Doesn&rsquo;t look like a valid GSTIN</p>}
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Business registration number</span>
            <Input value={form.businessRegistrationNumber} onChange={set('businessRegistrationNumber')} className="mt-1 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Trade license number</span>
            <Input value={form.tradeLicenseNumber} onChange={set('tradeLicenseNumber')} className="mt-1 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">NGO registration number</span>
            <Input value={form.ngoRegistrationNumber} onChange={set('ngoRegistrationNumber')} className="mt-1 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Government nursery ID</span>
            <Input value={form.governmentNurseryId} onChange={set('governmentNurseryId')} className="mt-1 h-11 rounded-full" />
          </label>
        </div>
      </details>
    </div>
  )
}

/** Default values for the extended fields, spread into a form's initial state alongside the
 * base nurseryName/description/city/contactPhone fields already handled by each page. */
export function extendedProfileDefaults(profile) {
  return {
    yearEstablished: profile?.yearEstablished ?? '',
    nurseryType: profile?.nurseryType || '',
    websiteUrl: profile?.websiteUrl || '',
    responsiblePersonName: profile?.responsiblePersonName || '',
    responsiblePersonRole: profile?.responsiblePersonRole || '',
    responsiblePersonPhone: profile?.responsiblePersonPhone || '',
    plantCategories: profile?.plantCategories || [],
    approxPlantCount: profile?.approxPlantCount || '',
    seasonalAvailability: Boolean(profile?.seasonalAvailability),
    bulkSupply: Boolean(profile?.bulkSupply),
    gstin: profile?.gstin || '',
    businessRegistrationNumber: profile?.businessRegistrationNumber || '',
    tradeLicenseNumber: profile?.tradeLicenseNumber || '',
    ngoRegistrationNumber: profile?.ngoRegistrationNumber || '',
    governmentNurseryId: profile?.governmentNurseryId || '',
  }
}

/** Builds the PATCH payload slice for the extended fields — omits empty optionals so they don't
 * clobber existing values with blanks, matching how SettingsClient already treats city/contactPhone. */
export function extendedProfilePayload(form) {
  return {
    yearEstablished: form.yearEstablished !== '' ? Number(form.yearEstablished) : undefined,
    nurseryType: form.nurseryType || undefined,
    websiteUrl: form.websiteUrl?.trim() || undefined,
    responsiblePersonName: form.responsiblePersonName?.trim() || undefined,
    responsiblePersonRole: form.responsiblePersonRole?.trim() || undefined,
    responsiblePersonPhone: form.responsiblePersonPhone || undefined,
    plantCategories: form.plantCategories,
    approxPlantCount: form.approxPlantCount || undefined,
    seasonalAvailability: form.seasonalAvailability,
    bulkSupply: form.bulkSupply,
    gstin: form.gstin?.trim() || undefined,
    businessRegistrationNumber: form.businessRegistrationNumber?.trim() || undefined,
    tradeLicenseNumber: form.tradeLicenseNumber?.trim() || undefined,
    ngoRegistrationNumber: form.ngoRegistrationNumber?.trim() || undefined,
    governmentNurseryId: form.governmentNurseryId?.trim() || undefined,
  }
}

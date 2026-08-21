'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import PhotoUploadField from '@/components/dashboard/PhotoUploadField'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { useNgoProfile } from '../NgoProfileContext'
import { proxy } from '../proxy'

export default function SettingsClient() {
  const { profile, loading, setProfile } = useNgoProfile()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        orgName: profile.orgName || '',
        description: profile.description || '',
        website: profile.website || '',
        contactPhone: profile.contactPhone || '',
        city: profile.city || '',
        foundedYear: profile.foundedYear ?? '',
        volunteerCountEstimate: profile.volunteerCountEstimate ?? '',
        awards: profile.awards?.length ? profile.awards : [],
      })
    }
  }, [profile])

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const addAward = () => setForm((s) => ({ ...s, awards: [...s.awards, { title: '', year: '', issuer: '' }] }))
  const removeAward = (index) => setForm((s) => ({ ...s, awards: s.awards.filter((_, i) => i !== index) }))
  const updateAward = (index, patch) =>
    setForm((s) => ({ ...s, awards: s.awards.map((a, i) => (i === index ? { ...a, ...patch } : a)) }))

  const submit = async (e) => {
    e.preventDefault()
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

      let updated
      if (logoFile) {
        const body = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined) body.append(k, v)
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

  if (loading || !form) {
    return (
      <DashboardPageShell className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full max-w-2xl" />
      </DashboardPageShell>
    )
  }

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

      <form onSubmit={submit} className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-4">
        <PhotoUploadField label="Organization logo" value={logoFile} onChange={setLogoFile} currentUrl={profile.logoUrl} />

        <label className="block">
          <span className="eyebrow">Organization name</span>
          <Input required value={form.orgName} onChange={set('orgName')} className="mt-2 h-11 rounded-full" />
        </label>
        <label className="block">
          <span className="eyebrow">About your organization</span>
          <Textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">Website (optional)</span>
            <Input value={form.website} onChange={set('website')} placeholder="https://" className="mt-2 h-11 rounded-full" />
          </label>
          <label className="block">
            <span className="eyebrow">Phone (optional)</span>
            <Input value={form.contactPhone} onChange={set('contactPhone')} className="mt-2 h-11 rounded-full" />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="eyebrow">City</span>
            <Input value={form.city} onChange={set('city')} className="mt-2 h-11 rounded-full" />
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

        <div>
          <span className="eyebrow">Awards & recognitions</span>
          <div className="mt-2 space-y-2.5">
            {form.awards.map((award, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Award {i + 1}</span>
                  <button type="button" onClick={() => removeAward(i)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-2">
                  <Input
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
                <Input
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

        <Button disabled={submitting} type="submit" className="rounded-full h-11">
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </DashboardPageShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import PhotoUploadField from '@/components/dashboard/PhotoUploadField'
import CitySelect from '@/components/dashboard/CitySelect'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { useNurseryProfile } from '../NurseryProfileContext'
import { proxy } from '../proxy'

export default function SettingsClient() {
  const { profile, loading, setProfile } = useNurseryProfile()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        nurseryName: profile.nurseryName || '',
        description: profile.description || '',
        city: profile.city || 'Pune',
        contactPhone: profile.contactPhone || '',
        followPolicy: profile.followPolicy || 'open',
      })
    }
  }, [profile])

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        nurseryName: form.nurseryName,
        description: form.description,
        city: form.city || undefined,
        contactPhone: form.contactPhone || undefined,
        followPolicy: form.followPolicy,
      }

      let updated
      if (logoFile || coverFile) {
        const body = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined) body.append(k, v)
        })
        if (logoFile) body.append('logo', logoFile)
        if (coverFile) body.append('coverPhoto', coverFile)
        updated = await proxy('/nursery/profile', { method: 'PATCH', body })
      } else {
        updated = await proxy('/nursery/profile', { method: 'PATCH', body: payload })
      }
      setProfile(updated)
      setLogoFile(null)
      setCoverFile(null)
      toast.success('Nursery details saved.')
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
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Nursery profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is what buyers and NGOs see for {profile.nurseryName}. Changes here don&rsquo;t affect your approval
          status.
        </p>
      </div>

      <form onSubmit={submit} className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PhotoUploadField label="Logo" value={logoFile} onChange={setLogoFile} currentUrl={profile.logoUrl} />
          <PhotoUploadField label="Cover photo" value={coverFile} onChange={setCoverFile} currentUrl={profile.coverPhotoUrl} />
        </div>

        <label className="block">
          <span className="eyebrow">Nursery name</span>
          <Input required value={form.nurseryName} onChange={set('nurseryName')} className="mt-2 h-11 rounded-full" />
        </label>
        <label className="block">
          <span className="eyebrow">About your nursery</span>
          <Textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow">City</span>
            <CitySelect value={form.city} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
          </label>
          <label className="block">
            <span className="eyebrow">Phone (optional)</span>
            <Input value={form.contactPhone} onChange={set('contactPhone')} className="mt-2 h-11 rounded-full" />
          </label>
        </div>

        <div>
          <span className="eyebrow">Follow requests</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: 'open', label: 'Anyone can follow' },
              { value: 'approval', label: 'I approve each request' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((s) => ({ ...s, followPolicy: opt.value }))}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${form.followPolicy === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:border-primary/40'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button disabled={submitting} type="submit" className="rounded-full h-11">
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </DashboardPageShell>
  )
}

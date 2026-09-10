'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import PhotoUploadField from '@/components/dashboard/PhotoUploadField'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import ConfirmDialog from '@/components/dashboard/ConfirmDialog'
import { useGroupProfile } from '../GroupProfileContext'
import { proxy } from '../proxy'

const GROUP_TYPES = [
  { id: 'family', label: 'Family' },
  { id: 'school', label: 'School' },
  { id: 'club', label: 'Club' },
  { id: 'other', label: 'Other' },
]

export default function SettingsClient() {
  const { profile, loading, setProfile } = useGroupProfile()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        groupName: profile.groupName || '',
        groupType: profile.groupType || 'other',
        description: profile.description || '',
        city: profile.city || '',
      })
    }
  }, [profile])

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let updated
      if (logoFile) {
        const body = new FormData()
        Object.entries(form).forEach(([k, v]) => body.append(k, v))
        body.append('logo', logoFile)
        updated = await proxy('/group/profile', { method: 'PATCH', body })
      } else {
        updated = await proxy('/group/profile', { method: 'PATCH', body: form })
      }
      setProfile(updated)
      setLogoFile(null)
      toast.success('Group details saved.')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const regenerateCode = async () => {
    setRegenerating(true)
    try {
      const updated = await proxy('/group/invite-code/regenerate', { method: 'POST' })
      setProfile(updated)
      setConfirmRegenerate(false)
      toast.success('New invite code generated.')
    } catch (err) {
      toast.error(err.message || 'Could not regenerate the invite code.')
    } finally {
      setRegenerating(false)
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
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Group profile</h1>
      </div>

      <form onSubmit={submit} className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-4">
        <PhotoUploadField label="Group logo" value={logoFile} onChange={setLogoFile} currentUrl={profile.logoUrl} />

        <label className="block">
          <span className="eyebrow">Group name</span>
          <Input required value={form.groupName} onChange={set('groupName')} className="mt-2 h-11 rounded-full" />
        </label>
        <label className="block">
          <span className="eyebrow">Group type</span>
          <select value={form.groupType} onChange={set('groupType')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40">
            {GROUP_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="eyebrow">About your group</span>
          <Textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 rounded-2xl" />
        </label>
        <label className="block">
          <span className="eyebrow">City</span>
          <Input value={form.city} onChange={set('city')} className="mt-2 h-11 rounded-full" />
        </label>

        <Button disabled={submitting} type="submit" className="rounded-full h-11">
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      <div className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium">Invite code</p>
          <p className="text-sm text-muted-foreground mt-1">
            Regenerating invalidates <span className="font-mono">{profile.inviteCode}</span> – anyone with the old code won't be able to join.
          </p>
        </div>
        <Button variant="outline" className="rounded-full gap-2" onClick={() => setConfirmRegenerate(true)}>
          <RefreshCw className="h-4 w-4" /> Regenerate
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="Regenerate invite code?"
        description="The current invite code will stop working immediately."
        confirmLabel="Regenerate"
        loading={regenerating}
        onConfirm={regenerateCode}
      />
    </DashboardPageShell>
  )
}

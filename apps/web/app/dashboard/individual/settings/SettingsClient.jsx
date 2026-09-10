'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Settings as SettingsIcon, UserRound, ShieldCheck, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { useAuth } from '@/components/site/AuthProvider'
import { proxy } from '@/lib/memberProxy'

const EMOJI_CHOICES = ['🌱', '🌳', '🌿', '🍃', '🌲', '🌴', '🌻', '🍀']

const SETTINGS_FIELDS = [
  { key: 'notifications', label: 'Push notifications', description: 'Get notified about likes, follows and updates.' },
  { key: 'streakReminders', label: 'Streak reminders', description: 'A nudge before your daily streak resets.' },
  { key: 'haptics', label: 'Haptics', description: 'Small vibrations on taps and actions (mobile).' },
  { key: 'sounds', label: 'Sounds', description: 'Sound effects for gamified moments.' },
  { key: 'ambientMode', label: 'Ambient mode', description: 'Gentle background ambience while browsing.' },
  { key: 'darkMode', label: 'Dark mode', description: 'Prefer a dark palette where supported.' },
  { key: 'locationTracking', label: 'Location tracking', description: 'Used for nearby drives and delivery tracking.' },
  { key: 'publicProfile', label: 'Public profile', description: 'Let others find and follow your profile.' },
  { key: 'analyticsEnabled', label: 'Usage analytics', description: 'Help us improve ARTH with anonymous usage data.' },
]

function ProfileSection() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setHandle(user.handle || '')
      setAvatarEmoji(user.avatarEmoji || '')
    }
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await proxy('/users/me', { method: 'PATCH', body: { name, handle, avatarEmoji: avatarEmoji || undefined } })
      await refresh()
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <UserRound className="h-4 w-4" />
        </span>
        <p className="font-serif text-lg">Profile</p>
      </div>

      <div>
        <Label className="eyebrow">Avatar</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setAvatarEmoji(e)}
              className={`h-10 w-10 rounded-full border text-lg grid place-items-center transition ${
                avatarEmoji === e ? 'border-primary bg-primary/15' : 'border-border/60 hover:border-primary/40'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="eyebrow">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 rounded-full" required />
        </div>
        <div>
          <Label htmlFor="handle" className="eyebrow">Handle</Label>
          <Input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            pattern="[a-z0-9_]+"
            className="mt-2 rounded-full"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="rounded-full">
        {saving ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}

function SettingsToggles() {
  const [settings, setSettings] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  useEffect(() => {
    proxy('/users/me/settings').then(setSettings).catch((err) => toast.error(err.message || 'Could not load settings.'))
  }, [])

  const toggle = async (key) => {
    const next = !settings[key]
    setSettings((prev) => ({ ...prev, [key]: next }))
    setSavingKey(key)
    try {
      await proxy('/users/me/settings', { method: 'PATCH', body: { [key]: next } })
    } catch (err) {
      setSettings((prev) => ({ ...prev, [key]: !next }))
      toast.error(err.message || 'Could not save setting.')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <SettingsIcon className="h-4 w-4" />
        </span>
        <p className="font-serif text-lg">Preferences</p>
      </div>

      <div className="mt-4 divide-y divide-border/60">
        {settings === null ? (
          <div className="py-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          SETTINGS_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
              </div>
              <Switch checked={!!settings[f.key]} disabled={savingKey === f.key} onCheckedChange={() => toggle(f.key)} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function SecuritySection() {
  const { logout } = useAuth()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await proxy('/users/me/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      toast.success('Password changed. Please sign in again.')
      // Changing the password revokes every session on the backend, including
      // this one's refresh token — sign out locally to match reality instead
      // of leaving the UI pointing at a session the server just killed.
      await logout()
      router.push('/login')
    } catch (err) {
      toast.error(err.message || 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      await proxy('/users/me', { method: 'DELETE' })
      await logout()
      router.push('/')
    } catch (err) {
      toast.error(err.message || 'Could not delete account.')
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-6">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <p className="font-serif text-lg">Security</p>
      </div>

      <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <div>
          <Label htmlFor="currentPassword" className="eyebrow">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-2 rounded-full"
            required
          />
        </div>
        <div>
          <Label htmlFor="newPassword" className="eyebrow">New password</Label>
          <Input
            id="newPassword"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-2 rounded-full"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} variant="outline" className="rounded-full">
            {saving ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>

      <div className="border-t border-border/60 pt-6">
        <p className="text-sm text-destructive">Danger zone</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          Deleting your account is permanent – your trees, adoptions and history stay recorded for the forest, but you lose access.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" className="mt-3 rounded-full">
              <Trash2 className="h-3.5 w-3.5" /> Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>This cannot be undone. You&rsquo;ll be signed out immediately.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="rounded-full">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" className="rounded-full" disabled={deleting} onClick={deleteAccount}>
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function SettingsClient() {
  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Account</p>
        <h1 className="font-serif text-3xl">Settings</h1>
      </div>

      <ProfileSection />
      <SettingsToggles />
      <SecuritySection />
    </DashboardPageShell>
  )
}

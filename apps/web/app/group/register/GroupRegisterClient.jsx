'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'

const GROUP_TYPES = [
  { id: 'family', label: 'Family' },
  { id: 'school', label: 'School' },
  { id: 'club', label: 'Club' },
  { id: 'other', label: 'Other' },
]

const initialForm = {
  email: '',
  password: '',
  name: '',
  handle: '',
  groupName: '',
  groupType: 'other',
  description: '',
}

function ConfirmationView({ groupName }) {
  return (
    <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
        <Users className="h-6 w-6" />
      </span>
      <h2 className="font-serif text-2xl md:text-3xl mt-6">Welcome, {groupName}. 🌱</h2>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Your group is live — no review wait. Share your invite code from the dashboard so members can join and
        start planting together.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/group/dashboard" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
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

function GroupRegisterForm() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedGroupName, setSubmittedGroupName] = useState(null)

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/group/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setSubmittedGroupName(form.groupName)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
        <p className="eyebrow text-primary">Register your group</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
          Bring your group to <em className="italic text-primary">ARTH</em>.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-md">
          Get a shared invite code, a combined forest, and group challenges. No review wait — you're live right away.
        </p>

        {submittedGroupName ? (
          <ConfirmationView groupName={submittedGroupName} />
        ) : (
        <form onSubmit={submit} className="mt-10 space-y-3">
          <label className="block">
            <span className="eyebrow">Group name</span>
            <input required value={form.groupName} onChange={set('groupName')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
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
            <textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>

          <div className="pt-4 border-t border-border/70">
            <p className="eyebrow">Your login</p>
          </div>
          <label className="block">
            <span className="eyebrow">Your name</span>
            <input required value={form.name} onChange={set('name')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">Handle</span>
            <input required value={form.handle} onChange={set('handle')} placeholder="lowercase_letters_numbers" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">Email</span>
            <input type="email" required value={form.email} onChange={set('email')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">Password</span>
            <input type="password" required minLength={8} value={form.password} onChange={set('password')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
            {submitting ? 'Creating group…' : 'Create your group'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-center text-muted-foreground">Already registered? <Link href="/group/login" className="text-primary">Sign in</Link></p>
        </form>
        )}
    </div>
  )
}

export default function GroupRegisterClient() {
  return (
    <Suspense fallback={null}>
      <GroupRegisterForm />
    </Suspense>
  )
}

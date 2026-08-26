'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sprout } from 'lucide-react'

const initialForm = {
  email: '',
  password: '',
  name: '',
  handle: '',
  orgName: '',
  description: '',
  website: '',
  contactPhone: '',
}

function ConfirmationView({ orgName }) {
  return (
    <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sprout className="h-6 w-6" />
      </span>
      <h2 className="font-serif text-2xl md:text-3xl mt-6">Thank you, {orgName}. 🌱</h2>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Your application has been submitted, and it&rsquo;s now in front of our team. We read every one closely —
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

function NgoRegisterForm() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedOrgName, setSubmittedOrgName] = useState(null)

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/ngo/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
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

  return (
    <div className="w-full max-w-xl mx-auto">
        <p className="eyebrow text-primary">Register your organization</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
          Bring your NGO to <em className="italic text-primary">ARTH</em>.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-md">
          Create drives, list adoptable trees, and run donation campaigns for the community. An ARTH admin reviews
          every organization before it goes live.
        </p>

        {submittedOrgName ? (
          <ConfirmationView orgName={submittedOrgName} />
        ) : (
        <form onSubmit={submit} className="mt-10 space-y-3">
          <label className="block">
            <span className="eyebrow">Organization name</span>
            <input required value={form.orgName} onChange={set('orgName')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">About your organization</span>
            <textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">Website (optional)</span>
              <input value={form.website} onChange={set('website')} placeholder="https://" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Phone (optional)</span>
              <input value={form.contactPhone} onChange={set('contactPhone')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
          </div>

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
            {submitting ? 'Submitting…' : 'Submit for review'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-center text-muted-foreground">Already registered? <Link href="/ngo/login" className="text-primary">Sign in</Link></p>
        </form>
        )}
    </div>
  )
}

export default function NgoRegisterClient() {
  return (
    <Suspense fallback={null}>
      <NgoRegisterForm />
    </Suspense>
  )
}

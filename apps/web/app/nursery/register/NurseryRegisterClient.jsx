'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sprout } from 'lucide-react'
import CitySelect from '@/components/dashboard/CitySelect'

const initialForm = {
  email: '',
  password: '',
  name: '',
  handle: '',
  nurseryName: '',
  description: '',
  city: 'Pune',
  contactPhone: '',
}

function ConfirmationView({ nurseryName }) {
  return (
    <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sprout className="h-6 w-6" />
      </span>
      <h2 className="font-serif text-2xl md:text-3xl mt-6">Thank you, {nurseryName}. 🌱</h2>
      <p className="mt-3 text-muted-foreground max-w-md mx-auto">
        Your application has been submitted, and it&rsquo;s now in front of our team. We&rsquo;ll email you the
        moment there&rsquo;s a decision. You can already sign in and set up your inventory in the meantime.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/nursery/dashboard" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
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

function NurseryRegisterForm() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedName, setSubmittedName] = useState(null)

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/nursery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setSubmittedName(form.nurseryName)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <p className="eyebrow text-primary">Register your nursery</p>
      <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
        Bring your nursery to <em className="italic text-primary">ARTH</em>.
      </h1>
      <p className="mt-4 text-muted-foreground max-w-md">
        List saplings, take orders, and respond to bulk requirements from NGOs. An ARTH admin reviews every
        nursery before it goes live.
      </p>

      {submittedName ? (
        <ConfirmationView nurseryName={submittedName} />
      ) : (
        <form onSubmit={submit} className="mt-10 space-y-3">
          <label className="block">
            <span className="eyebrow">Nursery name</span>
            <input required value={form.nurseryName} onChange={set('nurseryName')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">About your nursery</span>
            <textarea required rows={4} value={form.description} onChange={set('description')} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">City</span>
              <CitySelect value={form.city} onChange={(v) => setForm((s) => ({ ...s, city: v }))} />
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
          <p className="text-xs text-center text-muted-foreground">Already registered? <Link href="/nursery/login" className="text-primary">Sign in</Link></p>
        </form>
      )}
    </div>
  )
}

export default function NurseryRegisterClient() {
  return (
    <Suspense fallback={null}>
      <NurseryRegisterForm />
    </Suspense>
  )
}

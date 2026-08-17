'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

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

export default function NgoRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      router.push('/ngo/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-xl">
        <p className="eyebrow text-primary">Register your organization</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">
          Bring your NGO to <em className="italic text-primary">ARTH</em>.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-md">
          Create drives, list adoptable trees, and run donation campaigns for the community. An ARTH admin reviews
          every organization before it goes live.
        </p>

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
      </div>
    </div>
  )
}

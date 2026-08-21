'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function MemberRegisterClient() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', handle: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      router.push('/app/drives')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="eyebrow text-primary">Create an account</p>
      <h2 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Join the <em className="italic text-primary">movement</em>.</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        This account also works in the PLANT mobile app.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-3">
        <label className="block">
          <span className="eyebrow">Name</span>
          <input required value={form.name} onChange={update('name')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        <label className="block">
          <span className="eyebrow">Handle</span>
          <input required pattern="[a-z0-9_]+" minLength={3} maxLength={30} value={form.handle} onChange={update('handle')} placeholder="lowercase, numbers, underscores" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        <label className="block">
          <span className="eyebrow">Email</span>
          <input type="email" required value={form.email} onChange={update('email')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input type="password" required minLength={8} value={form.password} onChange={update('password')} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
          {submitting ? 'Creating account…' : 'Create account'}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-center text-muted-foreground">Already have an account? <Link href="/app/login" className="text-primary">Sign in</Link></p>
      </form>
    </div>
  )
}

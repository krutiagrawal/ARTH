'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

function NurseryLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/nursery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      router.push(searchParams.get('next') || '/nursery/dashboard')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="eyebrow text-primary">Nursery sign in</p>
      <h2 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Welcome <em className="italic text-primary">back</em>.</h2>
      <p className="mt-3 text-sm text-muted-foreground">For nursery accounts.</p>

      <form onSubmit={submit} className="mt-10 space-y-3">
        <label className="block">
          <span className="eyebrow">Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
          {submitting ? 'Signing in…' : 'Sign in'}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-center text-muted-foreground">Not registered yet? <Link href="/nursery/register" className="text-primary">Register your nursery</Link></p>
      </form>
    </div>
  )
}

export default function NurseryLoginClient() {
  return (
    <Suspense fallback={null}>
      <NurseryLoginForm />
    </Suspense>
  )
}

'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="pt-32 md:pt-40 pb-24">
        <div className="container max-w-md">
          <p className="text-sm text-destructive">This reset link is missing its token. Please request a new one.</p>
          <p className="text-xs text-center mt-6"><Link href="/forgot-password" className="text-primary">Request a new link</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-md">
        <p className="eyebrow text-primary">Reset password</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Choose a new <em className="italic text-primary">password</em>.</h1>

        {done ? (
          <p className="mt-10 text-sm">Password updated — taking you to sign in…</p>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-3">
            <label className="block">
              <span className="eyebrow">New password</span>
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Confirm password</span>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
              {submitting ? 'Updating…' : 'Update password'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}

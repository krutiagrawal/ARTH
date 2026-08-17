'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function App() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-md">
        <p className="eyebrow text-primary">Reset password</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Forgot your <em className="italic text-primary">password</em>?</h1>
        <p className="mt-4 text-muted-foreground">Enter your email and, if we find an account, we'll send a reset link.</p>

        {sent ? (
          <p className="mt-10 text-sm">If an account exists for that email, a reset link is on its way.</p>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-3">
            <label className="block">
              <span className="eyebrow">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@earth.org" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
              {submitting ? 'Sending…' : 'Send reset link'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
        <p className="text-xs text-center mt-6"><Link href="/login" className="text-primary">Back to sign in</Link></p>
      </div>
    </div>
  )
}
export default App

'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/site/AuthProvider'

const LOGIN_IMAGE = 'https://images.pexels.com/photos/8060360/pexels-photo-8060360.jpeg'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      await refresh()
      router.push(searchParams.get('next') || `/dashboard/${data.user.accountType}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-20">
      <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-12">
        <div className="relative hidden md:block md:col-span-6 lg:col-span-7 overflow-hidden">
          <img src={LOGIN_IMAGE} alt="A dreamy forest" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/45 via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col p-10 lg:p-16 text-background">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="eyebrow text-background/85">ARTH · Est. 2016</span>
            </div>
            <div className="mt-auto">
              <p className="eyebrow text-background/70">Welcome back</p>
              <h1 className="display text-6xl lg:text-8xl mt-6 leading-[0.95] max-w-lg">The <em className="text-primary">forest</em> was<br/>always waiting.</h1>
              <p className="mt-6 max-w-md text-background/90">Sign in to keep tending what you started.</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-6 lg:col-span-5 px-6 md:px-10 lg:px-16 py-16 md:py-24 flex flex-col justify-center">
          <p className="eyebrow">Sign in</p>
          <h2 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Welcome <em className="italic text-primary">back</em>.</h2>
          <p className="mt-4 text-muted-foreground max-w-sm">Enter your email and password to continue.</p>

          <form onSubmit={submit} className="mt-10 space-y-3">
            <label className="block">
              <span className="eyebrow">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@earth.org" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="block">
              <span className="eyebrow">Password</span>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
              {submitting ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-center text-muted-foreground">New here? <Link href="/register" className="text-primary">Create an account</Link></p>
            <p className="text-xs text-center"><Link href="/" className="text-primary">Back to home</Link></p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

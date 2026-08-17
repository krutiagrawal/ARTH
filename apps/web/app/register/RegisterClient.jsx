'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Users, Sprout, TreePine, Building2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/site/AuthProvider'

const REGISTER_IMAGE = 'https://images.pexels.com/photos/8060360/pexels-photo-8060360.jpeg'

const ACCOUNTS = [
  { id: 'individual', label: 'Individual', desc: 'Plant your own trees. Track your legacy.', icon: User },
  { id: 'community', label: 'Community', desc: 'Neighbourhoods and citizen groups.', icon: Users },
  { id: 'ngo', label: 'NGO', desc: 'Run drives. Verify impact.', icon: Sprout },
  { id: 'nursery', label: 'Nursery', desc: 'List native saplings.', icon: TreePine },
  { id: 'organisation', label: 'Organisation / CSR', desc: 'Adopt forests. Sponsor drives.', icon: Building2 },
]

function App() {
  const router = useRouter()
  const { refresh } = useAuth()
  const [accountType, setAccountType] = useState('individual')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [place, setPlace] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isNgo = accountType === 'ngo'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, accountType, place: place || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      await refresh()
      router.push(`/dashboard/${data.user.accountType}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-20">
      <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-12">
        <div className="relative hidden md:block md:col-span-6 lg:col-span-7 overflow-hidden">
          <img src={REGISTER_IMAGE} alt="A dreamy forest" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/45 via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col p-10 lg:p-16 text-background">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="eyebrow text-background/85">ARTH · Est. 2016</span>
            </div>
            <div className="mt-auto">
              <p className="eyebrow text-background/70">Welcome</p>
              <h1 className="display text-6xl lg:text-8xl mt-6 leading-[0.95] max-w-lg">The <em className="text-primary">forest</em> was<br/>always waiting.</h1>
              <p className="mt-6 max-w-md text-background/90">Every hand is welcome. Pick a doorway.</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-6 lg:col-span-5 px-6 md:px-10 lg:px-16 py-16 md:py-24 flex flex-col justify-center">
          <p className="eyebrow">Create an account</p>
          <h2 className="font-serif text-4xl md:text-5xl mt-4 leading-tight">Choose how you would <em className="italic text-primary">plant</em>.</h2>
          <p className="mt-4 text-muted-foreground max-w-sm">Every hand is welcome. Pick a doorway.</p>

          <div className="mt-8 grid gap-2">
            {ACCOUNTS.map((a, i) => (
              <motion.button key={a.id} type="button" onClick={() => setAccountType(a.id)} whileHover={{ x: 2 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className={`text-left rounded-2xl border p-4 flex items-center gap-4 transition ${accountType === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                <span className={`h-10 w-10 grid place-items-center rounded-full text-primary transition ${accountType === a.id ? 'bg-primary text-primary-foreground' : 'bg-primary/15'}`}><a.icon className="h-4 w-4" /></span>
                <div className="flex-1">
                  <div className="font-serif text-lg leading-tight">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
                <span className={`h-4 w-4 rounded-full border ${accountType === a.id ? 'bg-primary border-primary' : 'border-border'}`} />
              </motion.button>
            ))}
          </div>

          {isNgo ? (
            <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <p className="font-serif text-lg leading-tight">NGOs get their own verified doorway.</p>
              <p className="mt-2 text-sm text-muted-foreground">Running drives, listing adoptable trees, and receiving donations requires an approved NGO account — a separate, reviewed sign-up from the one here.</p>
              <Link href="/ngo/register" className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 h-11 text-sm hover:opacity-90 transition">
                Register your NGO
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs mt-4 text-center text-muted-foreground">Already have an NGO account? <Link href="/ngo/login" className="text-primary">Sign in</Link></p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-3">
              <label className="block">
                <span className="eyebrow">Name</span>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <label className="block">
                <span className="eyebrow">Email</span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@earth.org" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <label className="block">
                <span className="eyebrow">Place</span>
                <input value={place} onChange={e => setPlace(e.target.value)} placeholder="City, country" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <label className="block">
                <span className="eyebrow">Password</span>
                <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <label className="block">
                <span className="eyebrow">Confirm password</span>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button disabled={submitting} className="w-full h-12 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60" type="submit">
                {submitting ? 'Creating account…' : `Enter as ${ACCOUNTS.find(a => a.id === accountType).label}`}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-center text-muted-foreground">Already have an account? <Link href="/login" className="text-primary">Sign in</Link></p>
              <p className="text-xs text-center"><Link href="/" className="text-primary">Back to home</Link></p>
            </form>
          )}
          {isNgo && (
            <p className="text-xs text-center mt-6"><Link href="/" className="text-primary">Back to home</Link></p>
          )}
        </div>
      </div>
    </div>
  )
}
export default App

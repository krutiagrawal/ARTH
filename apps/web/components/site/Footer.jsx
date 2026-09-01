'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Instagram, Twitter, Youtube, Github, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error

  const subscribe = async (e) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
    <footer className="relative mt-16 border-t border-foreground/15 bg-background">
      <div className="px-5 md:px-10 pt-16 md:pt-24 pb-8 md:pb-10">
        {/* Big brand row */}
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <p className="eyebrow text-muted-foreground">ARTH · Est. 2026</p>
            <h3 className="display text-6xl md:text-8xl mt-4">Leave more than<br/><em className="text-primary">footprints</em>.</h3>
          </div>
          <div className="col-span-12 md:col-span-4 md:pb-6">
            {status === 'done' ? (
              <p className="text-sm">You're on the list — thank you.</p>
            ) : (
              <form onSubmit={subscribe} className="flex items-center gap-2 rounded-full border border-foreground/25 pl-4 pr-1 py-1">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email for gentle letters" className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                <button type="submit" disabled={status === 'submitting'} className="h-10 rounded-full bg-foreground text-background px-4 text-sm disabled:opacity-60">
                  {status === 'submitting' ? '…' : 'Subscribe'}
                </button>
              </form>
            )}
            {status === 'error' && <p className="text-xs mt-2 text-destructive">Something went wrong — try again.</p>}
            <p className="eyebrow text-muted-foreground mt-4">One quiet letter, once a season.</p>
          </div>
        </div>

        {/* Link grid */}
        <div className="mt-16 md:mt-24 grid grid-cols-12 gap-6 md:gap-10 border-t border-foreground/15 pt-10">
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow text-muted-foreground">Movement</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/mission" className="hover:text-primary">Mission</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary">How it works</Link></li>
              <li><Link href="/blogs" className="hover:text-primary">Journal</Link></li>
              <li><Link href="/donate" className="hover:text-primary">Donate</Link></li>
              <li><Link href="/adopt" className="hover:text-primary">Adopt a tree</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow text-muted-foreground">Explore</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/forests" className="hover:text-primary">Forests</Link></li>
              {/* TODO(post-launch): bring back once app/(marketing)/competitions and
                  /leaderboards are re-enabled (see the TODO note in each page.js). */}
              {/* <li><Link href="/competitions" className="hover:text-primary">Competitions</Link></li> */}
              {/* <li><Link href="/leaderboards" className="hover:text-primary">Leaderboards</Link></li> */}
              <li><Link href="/explore" className="hover:text-primary">Everything</Link></li>
              <li><Link href="/drives" className="hover:text-primary">Drives</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow text-muted-foreground">Partners</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/partners" className="hover:text-primary">Overview</Link></li>
              <li><Link href="/register" className="hover:text-primary">CSR / Company</Link></li>
              <li><Link href="/ngo/register" className="hover:text-primary">NGO</Link></li>
              <li><Link href="/register" className="hover:text-primary">Nursery</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow text-muted-foreground">Elsewhere</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link href="/contact" className="hover:text-primary inline-flex items-center gap-1">Contact <ArrowUpRight className="h-3.5 w-3.5" /></Link></li>
              <li className="flex items-center gap-4 pt-1 text-muted-foreground/50" title="Coming soon">
                <Instagram className="h-4 w-4" aria-hidden />
                <Twitter className="h-4 w-4" aria-hidden />
                <Youtube className="h-4 w-4" aria-hidden />
                <Github className="h-4 w-4" aria-hidden />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>ARTH® · Made in the shade of an old banyan.</p>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <Link href="/faq" className="hover:text-primary">FAQ</Link>
          </div>
          <p className="font-serif italic">A little gentler place can outlive all monuments.</p>
        </div>
      </div>
    </footer>
  )
}

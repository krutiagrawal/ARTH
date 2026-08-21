'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AMOUNTS = [500, 1500, 5000]

const STATUS_LABEL = { pending: 'Pending', paid: 'Paid', failed: 'Failed' }

export default function DonateClient({ ngoOptions, initialPledges, stripeEnabled }) {
  const [mine, setMine] = useState(initialPledges)
  const [ngo, setNgo] = useState(ngoOptions[0] ?? '')
  const [amount, setAmount] = useState(AMOUNTS[1])
  const [message, setMessage] = useState('')
  const [justPledged, setJustPledged] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo, amount, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setMine((m) => [data.pledge, ...m])
      setJustPledged(data.pledge)
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Donate to an NGO</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Support the hands that <em className="not-italic text-primary">plant</em>.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">
          {stripeEnabled
            ? "You'll be taken to Stripe to complete a secure payment."
            : "This is a pledge, not a live payment yet — donations aren't enabled on this deployment. We'll follow up once giving is live."}
        </p>

        {justPledged && (
          <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 flex items-start gap-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
            <div>
              <p className="font-serif text-xl">Pledge recorded — ₹{justPledged.amount.toLocaleString('en-IN')} to {justPledged.ngo}.</p>
              <p className="mt-1 text-sm text-muted-foreground">Saved to your account. Thank you for the intent — no charge has been made.</p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-10 space-y-4">
          <label className="block">
            <span className="eyebrow">Project / NGO</span>
            <select value={ngo} onChange={e => setNgo(e.target.value)} className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40">
              {ngoOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div>
            <span className="eyebrow">Amount (₹)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMOUNTS.map(a => (
                <button type="button" key={a} onClick={() => setAmount(a)} className={`rounded-full border px-5 h-11 text-sm transition ${amount === a ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-accent'}`}>₹{a.toLocaleString('en-IN')}</button>
              ))}
              <input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} className="h-11 w-32 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <label className="block">
            <span className="eyebrow">Message (optional)</span>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Say a little about why this matters to you." className="mt-2 w-full rounded-3xl border border-border bg-background px-5 py-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!ngo || amount <= 0 || submitting} className="rounded-full h-12 px-6">
            {submitting ? 'Redirecting…' : <>{stripeEnabled ? 'Donate' : 'Pledge'} ₹{amount.toLocaleString('en-IN')} <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        {mine.length > 0 && (
          <div className="mt-16">
            <p className="eyebrow mb-4">Your pledges</p>
            <div className="space-y-3">
              {mine.map(p => (
                <div key={p.id} className="rounded-2xl border border-border/70 bg-card p-4 flex items-center justify-between">
                  <p className="text-sm">{p.ngo}</p>
                  <div className="flex items-center gap-3">
                    {stripeEnabled && (
                      <span className={`text-xs rounded-full px-2.5 py-1 ${p.status === 'paid' ? 'bg-primary/15 text-primary' : p.status === 'failed' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    )}
                    <p className="font-serif text-lg">₹{p.amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

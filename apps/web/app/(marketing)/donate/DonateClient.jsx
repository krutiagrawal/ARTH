'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from '@/lib/memberProxy'

const AMOUNTS = [500, 1500, 5000, 10000]

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function PaymentForm({ onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    const { error: confirmError } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onCancel} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" className="rounded-full h-12 px-6" disabled={!stripe || submitting}>
          {submitting ? 'Processing…' : 'Confirm donation'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

export default function DonateClient() {
  const [campaigns, setCampaigns] = useState(null)
  const [campaignId, setCampaignId] = useState('')
  const [amount, setAmount] = useState(AMOUNTS[1])
  const [isOther, setIsOther] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    proxy('/campaigns').then((list) => {
      const active = list.filter((c) => c.status === 'active')
      setCampaigns(active)
      setCampaignId(active[0]?.id ?? '')
    }).catch(() => setCampaigns([]))
  }, [])

  const startPayment = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await proxy(`/campaigns/${campaignId}/donate`, {
        method: 'POST',
        body: { amountCents: Math.round(amount * 100) },
      })
      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err.status === 503 ? 'Donations aren’t live on this deployment yet – please check back soon.' : err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const selected = campaigns?.find((c) => c.id === campaignId)

  return (
    <div className="pt-24 md:pt-28 pb-24">
      <div className="container max-w-7xl">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="max-w-xl">
        <p className="eyebrow text-primary">Donate to an NGO</p>
        <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-3 text-balance">Support the hands that <em className="not-italic text-primary">plant</em>.</h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">Pick an active campaign from one of our approved NGOs – you'll pay securely, and 100% goes to their work.</p>

        {done ? (
          <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 flex items-start gap-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
            <div>
              <p className="font-serif text-xl">Thank you – your donation is on its way.</p>
              <p className="mt-1 text-sm text-muted-foreground">{selected ? `To ${selected.ngoName}.` : ''}</p>
            </div>
          </div>
        ) : campaigns === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No active campaigns right now – check back soon.</p>
        ) : clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => setDone(true)} onCancel={() => setClientSecret(null)} />
          </Elements>
        ) : (
          <form onSubmit={startPayment} className="mt-9 max-w-md space-y-6">
            <label className="block">
              <span className="eyebrow">Campaign</span>
              <select value={campaignId} onChange={e => setCampaignId(e.target.value)} className="mt-2.5 w-full h-12 rounded-2xl border border-border bg-transparent px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30">
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.title} – {c.ngoName}</option>)}
              </select>
            </label>
            <div>
              <span className="eyebrow">Amount (₹)</span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {AMOUNTS.map(a => (
                  <button type="button" key={a} onClick={() => { setAmount(a); setIsOther(false) }} className={`rounded-full border px-5 h-11 text-sm transition ${!isOther && amount === a ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}>₹{a.toLocaleString('en-IN')}</button>
                ))}
                <button type="button" onClick={() => setIsOther(true)} className={`rounded-full border px-5 h-11 text-sm transition ${isOther ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}>Other</button>
              </div>
              {isOther && (
                <input
                  type="number"
                  min={1}
                  autoFocus
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                  className="mt-2.5 h-11 w-40 rounded-full border border-border bg-transparent px-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              )}
              <p className="mt-3 text-xs text-muted-foreground">Your support helps with saplings, care, tools and field teams.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!stripePromise && <p className="text-xs text-muted-foreground">Donations aren't enabled on this deployment yet.</p>}
            <Button
              type="submit"
              disabled={!campaignId || amount <= 0 || submitting || !stripePromise}
              className="w-full rounded-full h-12 px-6 bg-foreground text-background hover:bg-foreground/90 shadow-none"
            >
              {submitting ? 'Preparing…' : <>Donate ₹{amount.toLocaleString('en-IN')} <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure payments. Trusted by thousands of planters.
            </p>
          </form>
        )}
      </div>

      <div className="hidden lg:block lg:sticky lg:top-28">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-full ring-1 ring-border/70 shadow-[0_36px_80px_-40px_rgba(24,25,18,0.5)]">
            <img src="/assets/ngo-dashboard/hero-hands-soil.jpg" alt="Hands cupping soil and a seedling" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-2 left-2 rounded-full bg-primary text-primary-foreground px-5 py-3.5 text-center shadow-[0_16px_36px_-16px_rgba(24,25,18,0.6)]">
            <p className="text-xl font-serif leading-none">100%</p>
            <p className="mt-1 text-[10px] leading-tight opacity-90">To the ground<br />No deductions</p>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}

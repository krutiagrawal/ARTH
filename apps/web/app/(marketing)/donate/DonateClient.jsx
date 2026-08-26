'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from '../../app/proxy'

const AMOUNTS = [500, 1500, 5000]

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
      setError(err.status === 503 ? 'Donations aren’t live on this deployment yet — please check back soon.' : err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const selected = campaigns?.find((c) => c.id === campaignId)

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Donate to an NGO</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Support the hands that <em className="not-italic text-primary">plant</em>.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">Pick an active campaign from one of our approved NGOs — you'll pay securely, and 100% goes to their work.</p>

        {done ? (
          <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 flex items-start gap-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
            <div>
              <p className="font-serif text-xl">Thank you — your donation is on its way.</p>
              <p className="mt-1 text-sm text-muted-foreground">{selected ? `To ${selected.ngoName}.` : ''}</p>
            </div>
          </div>
        ) : campaigns === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading campaigns…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No active campaigns right now — check back soon.</p>
        ) : clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => setDone(true)} onCancel={() => setClientSecret(null)} />
          </Elements>
        ) : (
          <form onSubmit={startPayment} className="mt-10 space-y-4">
            <label className="block">
              <span className="eyebrow">Campaign</span>
              <select value={campaignId} onChange={e => setCampaignId(e.target.value)} className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40">
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.title} — {c.ngoName}</option>)}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!stripePromise && <p className="text-xs text-muted-foreground">Donations aren't enabled on this deployment yet.</p>}
            <Button type="submit" disabled={!campaignId || amount <= 0 || submitting || !stripePromise} className="rounded-full h-12 px-6">
              {submitting ? 'Preparing…' : <>Donate ₹{amount.toLocaleString('en-IN')} <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

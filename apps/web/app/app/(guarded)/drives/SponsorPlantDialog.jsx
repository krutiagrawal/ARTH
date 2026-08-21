'use client'

import { useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { proxy } from '../../proxy'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

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
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" className="rounded-full" disabled={!stripe || submitting}>
          {submitting ? 'Processing…' : 'Pay & sponsor'}
        </Button>
      </div>
    </form>
  )
}

export default function SponsorPlantDialog({ driveId, plant, onOpenChange, onSponsored }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const open = Boolean(plant)

  useMemo(() => {
    if (!plant) return
    setLoading(true)
    setError('')
    setClientSecret(null)
    proxy(`/drives/${driveId}/plants/${plant.id}/sponsor`, { method: 'POST' })
      .then((data) => setClientSecret(data.clientSecret))
      .catch((err) => {
        setError(err.status === 503 ? 'Sponsorship payments aren’t live yet — please check back soon.' : err.message || 'Something went wrong.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant?.id])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Sponsor {plant?.speciesName}</DialogTitle>
          <DialogDescription>
            {plant && `Pay ${formatRupees(plant.priceCents)} to sponsor this plant at this drive.`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Preparing payment…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !stripePromise ? (
          <p className="text-sm text-muted-foreground">Sponsorship payments aren’t live yet — please check back soon.</p>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={() => onSponsored()} onCancel={() => onOpenChange(false)} />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

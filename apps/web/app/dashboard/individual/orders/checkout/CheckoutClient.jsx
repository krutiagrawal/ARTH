'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { proxy } from '@/lib/memberProxy'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function formatRupees(cents) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`
}

function PaymentForm({ onSuccess }) {
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
    <form onSubmit={submit} className="rounded-3xl border border-border/70 bg-card soft-shadow p-6 space-y-4">
      <p className="flex items-center gap-2 font-serif text-lg"><CreditCard className="h-4 w-4 text-primary" /> Payment</p>
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full rounded-full" disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  )
}

export default function CheckoutClient() {
  const router = useRouter()
  const [cart, setCart] = useState(null)
  const [addresses, setAddresses] = useState(null)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [line1, setLine1] = useState('')
  const [pincode, setPincode] = useState('')
  const [clientSecret, setClientSecret] = useState(null)
  const [preparing, setPreparing] = useState(false)

  useEffect(() => {
    proxy('/cart').then(setCart).catch((err) => toast.error(err.message || 'Could not load your cart.'))
    proxy('/addresses').then((rows) => {
      setAddresses(rows)
      const def = rows.find((a) => a.isDefault) ?? rows[0]
      if (def) setSelectedAddressId(def.id)
      if (rows.length === 0) setShowAddForm(true)
    }).catch((err) => toast.error(err.message || 'Could not load your addresses.'))
  }, [])

  const deliveryFeeCents = cart && cart.subtotalCents >= 49900 ? 0 : 4900
  const totalCents = (cart?.subtotalCents ?? 0) + deliveryFeeCents

  const handleAddAddress = async () => {
    if (!line1.trim() || !pincode.trim()) return
    try {
      const created = await proxy('/addresses', { method: 'POST', body: { line1: line1.trim(), pincode: pincode.trim() } })
      setAddresses((prev) => [...(prev ?? []), created])
      setSelectedAddressId(created.id)
      setShowAddForm(false)
      setLine1('')
      setPincode('')
    } catch (err) {
      toast.error(err.message || 'Could not save this address.')
    }
  }

  const beginPayment = async () => {
    if (!selectedAddressId) return
    setPreparing(true)
    try {
      const result = await proxy('/orders/checkout', { method: 'POST', body: { addressId: selectedAddressId } })
      setClientSecret(result.clientSecret)
    } catch (err) {
      toast.error(err.status === 503 ? 'Payments aren’t live yet — please check back soon.' : err.message || 'Something went wrong.')
    } finally {
      setPreparing(false)
    }
  }

  if (cart === null || addresses === null) {
    return (
      <DashboardPageShell className="max-w-2xl">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="max-w-2xl">
      <h1 className="font-serif text-3xl md:text-4xl">Checkout</h1>

      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            onSuccess={() => {
              toast.success('Order placed! We’ll email you a confirmation.')
              router.push('/dashboard/individual/orders')
            }}
          />
        </Elements>
      ) : (
        <>
          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6">
            <p className="flex items-center gap-2 font-serif text-lg"><MapPin className="h-4 w-4 text-primary" /> Delivery address</p>
            {addresses.length > 0 && (
              <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="mt-4 space-y-2.5">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 p-3.5 cursor-pointer has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={a.id} className="mt-0.5" />
                    <span className="text-sm">
                      {[a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(', ')}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {showAddForm ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-border/70 p-4">
                <Input placeholder="Flat / street / society" value={line1} onChange={(e) => setLine1(e.target.value)} />
                <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                <Button variant="outline" className="rounded-full" onClick={handleAddAddress}>
                  Save address
                </Button>
              </div>
            ) : (
              <button className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline" onClick={() => setShowAddForm(true)}>
                <Plus className="h-3.5 w-3.5" /> Add a new address
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-border/70 bg-card soft-shadow p-6">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatRupees(cart.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span>{deliveryFeeCents === 0 ? 'Free' : formatRupees(deliveryFeeCents)}</span>
              </div>
              <div className="flex justify-between border-t border-border/70 pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatRupees(totalCents)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-5 w-full rounded-full"
              disabled={!selectedAddressId || !cart.items.length || preparing}
              onClick={beginPayment}
            >
              {preparing ? 'Preparing…' : 'Continue to payment'}
            </Button>
          </div>
        </>
      )}
    </DashboardPageShell>
  )
}

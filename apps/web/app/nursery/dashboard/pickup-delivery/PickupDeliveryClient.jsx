'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, MapPin, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import { useNurseryProfile } from '../NurseryProfileContext'
import { proxy } from '../proxy'

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

export default function PickupDeliveryClient() {
  const { profile, loading, setProfile } = useNurseryProfile()
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        offersPickup: Boolean(profile.offersPickup),
        offersDelivery: Boolean(profile.offersDelivery),
        deliveryRadiusKm: profile.deliveryRadiusKm ?? '',
        deliveryFeeRupees: profile.deliveryFeeCents != null ? String(profile.deliveryFeeCents / 100) : '',
        minDeliveryOrderRupees: profile.minDeliveryOrderCents != null ? String(profile.minDeliveryOrderCents / 100) : '',
        pickupInstructions: profile.pickupInstructions || '',
        pickupWindows: profile.pickupWindows?.length ? profile.pickupWindows : [],
        operatingHours: profile.operatingHours?.length ? profile.operatingHours : [],
      })
    }
  }, [profile])

  const addPickupWindow = () => setForm((s) => ({ ...s, pickupWindows: [...s.pickupWindows, { label: '', startTime: '09:00', endTime: '18:00' }] }))
  const removePickupWindow = (i) => setForm((s) => ({ ...s, pickupWindows: s.pickupWindows.filter((_, idx) => idx !== i) }))
  const updatePickupWindow = (i, patch) => setForm((s) => ({ ...s, pickupWindows: s.pickupWindows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)) }))

  const addHours = () => setForm((s) => ({ ...s, operatingHours: [...s.operatingHours, { day: 'mon', opensAt: '09:00', closesAt: '18:00' }] }))
  const removeHours = (i) => setForm((s) => ({ ...s, operatingHours: s.operatingHours.filter((_, idx) => idx !== i) }))
  const updateHours = (i, patch) => setForm((s) => ({ ...s, operatingHours: s.operatingHours.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.offersPickup && !form.offersDelivery) {
      setError('Offer at least one of pickup or delivery.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        offersPickup: form.offersPickup,
        offersDelivery: form.offersDelivery,
        pickupInstructions: form.pickupInstructions || undefined,
        pickupWindows: form.pickupWindows,
        operatingHours: form.operatingHours,
      }
      if (form.offersDelivery) {
        if (form.deliveryRadiusKm !== '') payload.deliveryRadiusKm = Number(form.deliveryRadiusKm)
        payload.deliveryFeeCents = form.deliveryFeeRupees !== '' ? Math.round(Number(form.deliveryFeeRupees) * 100) : 0
        payload.minDeliveryOrderCents = form.minDeliveryOrderRupees !== '' ? Math.round(Number(form.minDeliveryOrderRupees) * 100) : 0
      }
      const updated = await proxy('/nursery/profile', { method: 'PATCH', body: payload })
      setProfile(updated)
      toast.success('Pickup & delivery settings saved.')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !form) {
    return (
      <DashboardPageShell className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full max-w-2xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell className="space-y-6">
      <div>
        <p className="eyebrow text-primary">Pickup & Delivery</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">How buyers get their saplings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure whether you offer pickup, delivery, or both.</p>
      </div>

      <form onSubmit={submit} className="max-w-2xl rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition ${form.offersPickup ? 'border-primary bg-primary/5' : 'border-border/70'}`}>
            <input type="checkbox" checked={form.offersPickup} onChange={(e) => setForm((s) => ({ ...s, offersPickup: e.target.checked }))} className="h-4 w-4 rounded border-border/70" />
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Offer pickup
            </span>
          </label>
          <label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition ${form.offersDelivery ? 'border-primary bg-primary/5' : 'border-border/70'}`}>
            <input type="checkbox" checked={form.offersDelivery} onChange={(e) => setForm((s) => ({ ...s, offersDelivery: e.target.checked }))} className="h-4 w-4 rounded border-border/70" />
            <span className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-primary" /> Offer delivery
            </span>
          </label>
        </div>

        {form.offersDelivery && (
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
            <p className="eyebrow">Delivery settings</p>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Radius (km)</span>
                <Input type="number" min="0" value={form.deliveryRadiusKm} onChange={(e) => setForm((s) => ({ ...s, deliveryRadiusKm: e.target.value }))} className="mt-1 h-10 rounded-full" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Delivery fee (₹)</span>
                <Input type="number" min="0" value={form.deliveryFeeRupees} onChange={(e) => setForm((s) => ({ ...s, deliveryFeeRupees: e.target.value }))} className="mt-1 h-10 rounded-full" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Free delivery above (₹)</span>
                <Input type="number" min="0" value={form.minDeliveryOrderRupees} onChange={(e) => setForm((s) => ({ ...s, minDeliveryOrderRupees: e.target.value }))} className="mt-1 h-10 rounded-full" />
              </label>
            </div>
          </div>
        )}

        {form.offersPickup && (
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
            <p className="eyebrow">Pickup settings</p>
            <label className="block">
              <span className="text-xs text-muted-foreground">Instructions for buyers</span>
              <Textarea rows={2} value={form.pickupInstructions} onChange={(e) => setForm((s) => ({ ...s, pickupInstructions: e.target.value }))} className="mt-1 rounded-xl" />
            </label>
            <div>
              <span className="text-xs text-muted-foreground">Pickup windows</span>
              <div className="mt-2 space-y-2">
                {form.pickupWindows.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Label (e.g. Morning)" value={w.label} onChange={(e) => updatePickupWindow(i, { label: e.target.value })} className="h-9 rounded-full flex-1" />
                    <Input type="time" value={w.startTime} onChange={(e) => updatePickupWindow(i, { startTime: e.target.value })} className="h-9 rounded-full w-28" />
                    <Input type="time" value={w.endTime} onChange={(e) => updatePickupWindow(i, { endTime: e.target.value })} className="h-9 rounded-full w-28" />
                    <button type="button" onClick={() => removePickupWindow(i)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2 rounded-full" onClick={addPickupWindow}>
                <Plus className="h-3.5 w-3.5" /> Add pickup window
              </Button>
            </div>
          </div>
        )}

        <div>
          <span className="eyebrow">Operating hours</span>
          <div className="mt-2 space-y-2">
            {form.operatingHours.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={h.day} onChange={(e) => updateHours(i, { day: e.target.value })} className="h-9 rounded-full border border-border/70 bg-background px-3 text-sm">
                  {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <Input type="time" value={h.opensAt} onChange={(e) => updateHours(i, { opensAt: e.target.value })} className="h-9 rounded-full w-28" />
                <Input type="time" value={h.closesAt} onChange={(e) => updateHours(i, { closesAt: e.target.value })} className="h-9 rounded-full w-28" />
                <button type="button" onClick={() => removeHours(i)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2 rounded-full" onClick={addHours}>
            <Plus className="h-3.5 w-3.5" /> Add hours
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button disabled={submitting} type="submit" className="rounded-full h-11">
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </DashboardPageShell>
  )
}

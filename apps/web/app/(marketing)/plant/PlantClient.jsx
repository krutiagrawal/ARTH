'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { proxy } from '../../app/proxy'

export default function PlantClient() {
  const [species, setSpecies] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState({ nickname: '', speciesId: '', locationLabel: '' })
  const [justAdded, setJustAdded] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    proxy('/species').then((list) => {
      setSpecies(list)
      setForm((f) => (f.speciesId ? f : { ...f, speciesId: list[0]?.id ?? '' }))
    }).catch(() => {})
    proxy('/trees').then(setMine).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nickname.trim() || !form.speciesId) return
    setError('')
    setSubmitting(true)
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('no-geolocation'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      }).catch(() => null)

      const body = new FormData()
      body.set('nickname', form.nickname)
      body.set('speciesId', form.speciesId)
      body.set('lat', String(position?.coords.latitude ?? 0))
      body.set('lng', String(position?.coords.longitude ?? 0))
      if (form.locationLabel) body.set('locationLabel', form.locationLabel)

      const tree = await proxy('/trees', { method: 'POST', body })
      setMine((m) => [tree, ...m])
      setJustAdded(tree)
      setForm((f) => ({ ...f, nickname: '', locationLabel: '' }))
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Plant by myself</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Register the tree <em className="not-italic text-primary">you're</em> planting.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">Find a sapling and a spot that means something, then register it here to start tracking its story. We'll use your device's location to place it on the map.</p>

        {justAdded && (
          <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 flex items-start gap-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
            <div>
              <p className="font-serif text-xl">{justAdded.nickname} is registered.</p>
              <p className="mt-1 text-sm text-muted-foreground">Saved to your account — see it below anytime, or plant another.</p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-10 space-y-4">
          <label className="block">
            <span className="eyebrow">Tree's name</span>
            <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="e.g. Aarambh" className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">Species</span>
            <select value={form.speciesId} onChange={e => setForm(f => ({ ...f, speciesId: e.target.value }))} className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40">
              {species.map(s => <option key={s.id} value={s.id}>{s.commonName}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">Location (optional label)</span>
            <input value={form.locationLabel} onChange={e => setForm(f => ({ ...f, locationLabel: e.target.value }))} placeholder="e.g. Behind the old well, Kochi" className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting} className="rounded-full h-12 px-6">
            {submitting ? 'Registering…' : 'Register your tree'} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {mine.length > 0 && (
          <div className="mt-16">
            <p className="eyebrow mb-4">Your registered trees</p>
            <div className="space-y-3">
              {mine.map(t => (
                <div key={t.id} className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="font-serif text-lg">{t.nickname} <span className="text-sm text-muted-foreground italic">— {t.species}</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{t.location}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

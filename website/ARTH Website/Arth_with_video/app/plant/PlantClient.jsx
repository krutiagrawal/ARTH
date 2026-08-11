'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SPECIES = ['Neem', 'Banyan', 'Mango', 'Arjuna', 'Peepal', 'Amla', 'Gulmohar', 'Other']

export default function PlantClient({ initialTrees }) {
  const [mine, setMine] = useState(initialTrees)
  const [form, setForm] = useState({ name: '', species: SPECIES[0], location: '', message: '' })
  const [justAdded, setJustAdded] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.location.trim()) return
    setError('')
    const res = await fetch('/api/planted-trees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      return
    }
    setMine((m) => [data.tree, ...m])
    setJustAdded(data.tree)
    setForm({ name: '', species: SPECIES[0], location: '', message: '' })
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Plant by myself</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Register the tree <em className="not-italic text-primary">you're</em> planting.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">Find a sapling and a spot that means something, then register it here to start tracking its story.</p>

        {justAdded && (
          <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6 flex items-start gap-4">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
            <div>
              <p className="font-serif text-xl">{justAdded.name} is registered.</p>
              <p className="mt-1 text-sm text-muted-foreground">Saved to your account — see it below anytime, or plant another.</p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-10 space-y-4">
          <label className="block">
            <span className="eyebrow">Tree's name</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aarambh" className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">Species</span>
            <select value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))} className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40">
              {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">Location</span>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Behind the old well, Kochi" className="mt-2 w-full h-12 rounded-full border border-border bg-background px-5 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          <label className="block">
            <span className="eyebrow">A message to leave with it (optional)</span>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="May someone I never meet rest beneath its shade." rows={3} className="mt-2 w-full rounded-3xl border border-border bg-background px-5 py-4 outline-none focus:ring-2 focus:ring-primary/40" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="rounded-full h-12 px-6">
            Register your tree <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {mine.length > 0 && (
          <div className="mt-16">
            <p className="eyebrow mb-4">Your registered trees</p>
            <div className="space-y-3">
              {mine.map(t => (
                <div key={t.id} className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="font-serif text-lg">{t.name} <span className="text-sm text-muted-foreground italic">— {t.species}</span></p>
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

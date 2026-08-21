'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Trophy, Heart, Plus, X } from 'lucide-react'
import SectionWrapper from '@/components/site/SectionWrapper'
import { Button } from '@/components/ui/button'

function useCountdown(deadline) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const diff = Math.max(0, new Date(deadline).getTime() - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { d, h, m, s }
}

export default function CompetitionDetailClient({ comp, initialEntries, isLoggedIn }) {
  const { d, h, m, s } = useCountdown(comp.deadline)
  const [entries, setEntries] = useState(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/competitions/${comp.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, imageUrl: imageUrl || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setEntries((es) => [{ ...data.entry, user: { name: 'You' }, hasVoted: false }, ...es])
      setShowForm(false)
      setTitle('')
      setDescription('')
      setImageUrl('')
    } finally {
      setSubmitting(false)
    }
  }

  const vote = async (entryId) => {
    const res = await fetch(`/api/competitions/${comp.id}/entries/${entryId}/vote`, { method: 'POST' })
    if (!res.ok) return
    setEntries((es) => es.map((e) => (e.id === entryId ? { ...e, votes: e.votes + 1, hasVoted: true } : e)))
  }

  return (
    <div>
      <section className="relative h-[60vh] min-h-[480px]">
        <img src={comp.imageUrl} alt={comp.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-foreground/40 to-background" />
        <div className="relative z-10 container h-full flex flex-col justify-end pb-16 text-background">
          <Link href="/competitions" className="mb-6 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"><ArrowLeft className="h-4 w-4" /> All competitions</Link>
          <p className="text-xs uppercase tracking-[0.22em] opacity-80">Competition</p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.98] mt-2 max-w-3xl">{comp.title}</h1>
          <p className="mt-4 max-w-xl text-lg opacity-90">{comp.tagline}</p>
        </div>
      </section>

      <section className="container -mt-8 relative z-10">
        <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 soft-shadow">
          {[{l:'Days', v:d},{l:'Hours', v:h},{l:'Minutes', v:m},{l:'Seconds', v:s}].map(x => (
            <div key={x.l}><div className="text-xs uppercase tracking-widest text-muted-foreground">{x.l}</div><div className="font-serif text-4xl mt-1">{String(x.v).padStart(2, '0')}</div></div>
          ))}
        </div>
      </section>

      <SectionWrapper eyebrow="Entries" title="Cast a vote. Grow the movement.">
        {entries.length === 0 && !showForm && (
          <p className="text-muted-foreground mb-8">No entries yet — be the first to submit one.</p>
        )}
        {entries.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((e, i) => (
              <div key={e.id} className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  {e.imageUrl && <img src={e.imageUrl} alt={e.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />}
                  {i === 0 && <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[10px] uppercase tracking-widest"><Trophy className="h-3 w-3" /> Leading</span>}
                </div>
                <div className="p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg truncate">{e.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">by {e.user.name} · {e.votes} votes</p>
                  </div>
                  <button onClick={() => vote(e.id)} disabled={!isLoggedIn || e.hasVoted} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent">
                    <Heart className={`h-3.5 w-3.5 ${e.hasVoted ? 'fill-destructive text-destructive' : 'text-destructive'}`} /> {e.hasVoted ? 'Voted' : 'Vote'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          {isLoggedIn ? (
            showForm ? (
              <form onSubmit={submit} className="max-w-lg rounded-3xl border border-border/70 bg-card p-6 soft-shadow space-y-3">
                <label className="block">
                  <span className="eyebrow">Title *</span>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                </label>
                <label className="block">
                  <span className="eyebrow">Description *</span>
                  <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40" />
                </label>
                <label className="block">
                  <span className="eyebrow">Image URL (optional)</span>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="mt-2 w-full h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40" />
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button disabled={submitting} type="submit" className="rounded-full">{submitting ? 'Submitting…' : 'Submit entry'}</Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowForm(false)}><X className="h-4 w-4" /> Cancel</Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setShowForm(true)} className="rounded-full"><Plus className="h-4 w-4" /> Submit your entry</Button>
            )
          ) : (
            <Button asChild className="rounded-full"><Link href={`/login?next=/competitions/${comp.id}`}>Sign in to submit an entry</Link></Button>
          )}
          <Button asChild variant="outline" className="rounded-full ml-3"><Link href="/competitions">Browse other competitions</Link></Button>
        </div>
      </SectionWrapper>
    </div>
  )
}

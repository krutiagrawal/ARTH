'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, MapPin, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DrivesClient({ initialDrives, initialJoinedIds }) {
  const [drives, setDrives] = useState(initialDrives)
  const [joinedIds, setJoinedIds] = useState(new Set(initialJoinedIds))
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  const join = async (drive) => {
    setPending(drive.id)
    setError('')
    try {
      const res = await fetch('/api/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: drive.id }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setJoinedIds((prev) => new Set(prev).add(drive.id))
      setDrives((prev) => prev.map((d) => (d.id === drive.id ? { ...d, spotsLeft: Math.max(0, d.spotsLeft - 1) } : d)))
    } finally {
      setPending(null)
    }
  }

  const isJoined = (id) => joinedIds.has(id)

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Join an NGO drive</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Plant with people who <em className="not-italic text-primary">show up</em>.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">Verified drives run by partner NGOs. Reserve your place.</p>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-12 space-y-4">
          {drives.map(d => {
            const joined = isJoined(d.id)
            return (
              <div key={d.id} className="rounded-3xl border border-border/70 bg-card p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex-1">
                  <h3 className="font-serif text-xl">{d.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{d.ngo}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {d.date}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {d.spotsLeft} of {d.spots} spots left</span>
                  </div>
                </div>
                <Button onClick={() => join(d)} disabled={joined || pending === d.id || d.spotsLeft <= 0} variant={joined ? 'secondary' : 'default'} className="rounded-full h-10 shrink-0">
                  {joined ? <><Check className="h-4 w-4" /> You're in</> : d.spotsLeft <= 0 ? 'Full' : pending === d.id ? 'Joining…' : 'RSVP'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

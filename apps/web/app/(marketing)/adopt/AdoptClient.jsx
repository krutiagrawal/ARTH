'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdoptClient({ trees, initialAdoptedIds }) {
  const [adoptedIds, setAdoptedIds] = useState(new Set(initialAdoptedIds))
  const [pending, setPending] = useState(null)

  const adopt = async (tree) => {
    setPending(tree.id)
    try {
      const res = await fetch('/api/adoptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeId: tree.id }),
      })
      if (res.ok || res.status === 409) {
        setAdoptedIds((prev) => new Set(prev).add(tree.id))
      }
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="pt-32 md:pt-40 pb-24">
      <div className="container max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <p className="eyebrow text-primary">Adopt a tree</p>
        <h1 className="font-serif text-4xl md:text-6xl leading-[1.02] mt-4 text-balance">Choose one that's already <em className="not-italic text-primary">growing</em>.</h1>
        <p className="mt-5 text-muted-foreground max-w-lg">These trees already have a story. Adopt one to take on its care and follow what happens next.</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {trees.map(t => {
            const adopted = adoptedIds.has(t.id)
            return (
              <div key={t.id} className="overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={t.imageUrl} alt={t.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground italic">{t.species}</p>
                  <h3 className="font-serif text-2xl mt-1">{t.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.location}</p>
                  <Button onClick={() => adopt(t)} disabled={adopted || pending === t.id} variant={adopted ? 'secondary' : 'default'} className="mt-4 rounded-full h-10 w-full">
                    {adopted ? <><Check className="h-4 w-4" /> Adopted</> : pending === t.id ? 'Adopting…' : 'Adopt this tree'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

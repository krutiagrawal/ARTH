'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Trophy, Heart } from 'lucide-react'
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

export default function CompetitionDetailClient({ comp, forestImages }) {
  const { d, h, m, s } = useCountdown(comp.deadline)
  const entries = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    img: forestImages[i % forestImages.length],
    title: [`Morning oak`, `Under the mango`, `A quiet arjuna`, `The village grove`, `First rain`, `The old banyan`][i],
    votes: 900 - i * 120 - Math.floor(Math.random() * 90),
  }))
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
        <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 leaf-shadow">
          {[{l:'Days', v:d},{l:'Hours', v:h},{l:'Minutes', v:m},{l:'Seconds', v:s}].map(x => (
            <div key={x.l}><div className="text-xs uppercase tracking-widest text-muted-foreground">{x.l}</div><div className="font-serif text-4xl mt-1">{String(x.v).padStart(2, '0')}</div></div>
          ))}
        </div>
      </section>

      <SectionWrapper eyebrow="Top entries" title="Cast a vote. Grow the movement.">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((e, i) => (
            <div key={e.id} className="group overflow-hidden rounded-3xl border border-border/70 bg-card leaf-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={e.img} alt={e.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                {i === 0 && <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-[10px] uppercase tracking-widest"><Trophy className="h-3 w-3" /> Leading</span>}
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg">{e.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{e.votes} votes</p>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary"><Heart className="h-3.5 w-3.5 text-destructive" /> Vote</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link href="/login">Submit your entry</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/competitions">Browse other competitions</Link></Button>
        </div>
      </SectionWrapper>
    </div>
  )
}

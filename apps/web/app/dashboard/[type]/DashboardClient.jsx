'use client'
import Link from 'next/link'
import { MapPin, Sparkles } from 'lucide-react'
import SectionWrapper from '@/components/site/SectionWrapper'
import AnimatedCounter from '@/components/site/AnimatedCounter'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/site/AuthProvider'

const PROFILES = {
  individual: { name: 'Ananya Rao', role: 'Planter', place: 'Bengaluru', stats: [{l:'Your trees', v:14},{l:'Species',v:6},{l:'Communities',v:2},{l:'Streak (weeks)',v:38}] },
  community: { name: 'Yellapur Greens', role: 'Community', place: 'Karnataka', stats: [{l:'Members',v:214},{l:'Trees planted',v:24810},{l:'Drives held',v:41},{l:'Species',v:37}] },
  ngo: { name: 'Groves & Grains Trust', role: 'NGO', place: 'India', stats: [{l:'Drives run',v:312},{l:'Forests',v:8},{l:'Trees',v:128400},{l:'Volunteers',v:6410}] },
  nursery: { name: 'The Native Nursery', role: 'Nursery', place: 'Bengaluru', stats: [{l:'Saplings ready',v:14210},{l:'Species',v:82},{l:'Orders (mo)',v:126},{l:'Partners',v:24}] },
  organisation: { name: 'Terra Textiles', role: 'CSR Partner', place: 'India', stats: [{l:'Trees funded',v:48720},{l:'Forests adopted',v:5},{l:'NGO partners',v:11},{l:'Employees planted',v:840}] },
}

export default function DashboardClient({ type, forests, blogs }) {
  const { user } = useAuth()
  const p = PROFILES[type]
  const firstName = user?.name?.split(' ')[0] || p.name.split(' ')[0]
  const place = user?.place || p.place
  return (
    <div className="pt-32">
      <section className="container">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Dashboard · {p.role}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1] text-balance">Welcome back, {firstName}.</h1>
            <p className="mt-3 text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> {place}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full"><Link href="/explore">Explore</Link></Button>
            <Button asChild className="rounded-full"><Link href="/forests">Plant today</Link></Button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          {p.stats.map(s => (
            <div key={s.l} className="rounded-3xl border border-border/70 bg-card p-6 leaf-shadow">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
              <div className="font-serif text-4xl mt-2"><AnimatedCounter value={s.v} /></div>
            </div>
          ))}
        </div>
      </section>

      <SectionWrapper eyebrow="Your forests" title="Places you have touched.">
        <div className="grid gap-6 md:grid-cols-3">
          {forests.map(f => (
            <Link key={f.id} href={`/forests/${f.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card leaf-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={f.imageUrl} alt={f.name} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.location}</p>
                <h3 className="font-serif text-xl mt-1">{f.name}</h3>
                <p className="text-xs text-muted-foreground mt-2">{f.trees.toLocaleString()} trees · {f.species} species</p>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper eyebrow="Upcoming" title="This week in the movement.">
        <div className="grid gap-5 md:grid-cols-2">
          {[{t:'Community drive · Aravali Grove',d:'Saturday · 06:30 AM',n:'32 volunteers already going'},{t:'Nursery pickup · Native Nursery',d:'Sunday · 10:00 AM',n:'12 native species available'},{t:'Legacy story submission · due',d:'Monday · 11:59 PM',n:'Best Legacy Quote competition'},{t:'Impact review with Terra Textiles',d:'Wednesday · 04:00 PM',n:'Quarterly CSR report'}].map(x => (
            <div key={x.t} className="rounded-3xl border border-border/70 bg-card p-6 leaf-shadow flex items-start gap-4">
              <span className="h-11 w-11 grid place-items-center rounded-full bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
              <div className="flex-1">
                <div className="font-serif text-lg">{x.t}</div>
                <div className="text-xs text-muted-foreground">{x.d}</div>
                <div className="text-xs mt-2">{x.n}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper eyebrow="Reading" title="From the journal.">
        <div className="grid gap-6 md:grid-cols-3">
          {blogs.map(b => (
            <Link key={b.id} href={`/blogs/${b.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card leaf-shadow">
              <div className="relative aspect-[4/3] overflow-hidden"><img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" /></div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest text-primary">{b.category}</p>
                <h3 className="font-serif text-lg mt-1 leading-snug">{b.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

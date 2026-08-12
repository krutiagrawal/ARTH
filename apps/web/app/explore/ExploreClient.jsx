'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, MapPin, ArrowUpRight } from 'lucide-react'

const FILTERS = ['All', 'Forests', 'Trees', 'Stories', 'Competitions']

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function ExploreClient({ items: allItems }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState('All')

  const items = useMemo(() => {
    return allItems.filter(i => (f === 'All' || i.type === f) && (q.trim() === '' || (i.title + ' ' + i.sub).toLowerCase().includes(q.toLowerCase())))
  }, [allItems, q, f])

  return (
    <div>
      {/* Hero */}
      <section className="pt-36 md:pt-48 pb-10 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Explore</p>
            <Reveal><h1 className="display text-[14vw] md:text-[9vw] mt-6">Wander <em className="text-primary">gently</em>.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">Forests, legacy trees, stories, species and events. Search freely.</p>
          </Reveal>
        </div>
      </section>

      {/* Search / filter bar */}
      <section className="px-5 md:px-10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 border-y border-foreground/15 py-5">
          <div className="flex items-center gap-2 rounded-full border border-foreground/25 pl-4 pr-1 py-1 flex-1 max-w-xl">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search forests, trees, stories…" className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(x => (
              <button key={x} onClick={() => setF(x)} className={`rounded-full border px-3 py-1 text-xs transition ${f === x ? 'bg-foreground text-background border-foreground' : 'border-foreground/25 hover:bg-foreground/5'}`}>{x}</button>
            ))}
          </div>
          <span className="eyebrow md:ml-auto">{items.length} results</span>
        </div>
      </section>

      {/* Masonry grid */}
      <section className="px-5 md:px-10 py-16 md:py-24">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]">
          {items.map((i, idx) => (
            <Reveal key={i.type + i.id} className="mb-6 break-inside-avoid" delay={Math.min(idx * 0.03, 0.4)}>
              <Link href={i.href} className="group block overflow-hidden rounded-3xl soft-shadow bg-secondary">
                <div className="relative overflow-hidden">
                  <img src={i.img} alt={i.title} className="w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                  <span className="absolute top-4 left-4 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-widest">{i.type}</span>
                  <span className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full bg-background/90 backdrop-blur opacity-0 group-hover:opacity-100 transition"><ArrowUpRight className="h-4 w-4" /></span>
                </div>
                <div className="p-5 bg-background">
                  <h3 className="font-serif text-xl md:text-2xl leading-snug">{i.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {i.sub}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

const CATS = ['All', 'Wildlife', 'Plantation Guides', 'Native Species', 'Environmental News', 'Editorial']

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function BlogsClient({ featured, blogs }) {
  const [c, setC] = useState('All')
  const filtered = blogs.filter(b => c === 'All' || b.category === c)
  return (
    <div>
      {/* Hero */}
      <section className="pt-36 md:pt-48 pb-8 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">The Journal</p>
            <Reveal><h1 className="display text-[14vw] md:text-[9vw] mt-6">Slow reading.<br/><em className="text-primary">Long walks</em>.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">Field notes, plantation guides, wildlife dispatches – written by the people doing the work.</p>
          </Reveal>
        </div>
      </section>

      {/* Featured — magazine layout */}
      <section className="px-5 md:px-10 py-16 md:py-24">
        <Link href={`/blogs/${featured.id}`} className="group grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 md:col-span-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl soft-shadow">
              <img src={featured.imageUrl} alt={featured.title} className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 md:pb-8">
            <p className="eyebrow">Featured · {featured.category}</p>
            <h2 className="font-serif text-4xl md:text-6xl mt-4 leading-[1] group-hover:text-primary transition-colors">{featured.title}</h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">{featured.excerpt}</p>
            <p className="mt-6 text-xs eyebrow">{featured.author} · {featured.date} · {featured.minutes} min</p>
          </div>
        </Link>
      </section>

      {/* Filters */}
      <section className="px-5 md:px-10">
        <div className="flex flex-wrap items-center gap-2 border-y border-foreground/15 py-5">
          <span className="eyebrow mr-3">Filter</span>
          {CATS.map(x => (
            <button key={x} onClick={() => setC(x)} className={`rounded-full border px-3 py-1 text-xs transition ${c === x ? 'bg-foreground text-background border-foreground' : 'border-foreground/25 hover:bg-foreground/5'}`}>{x}</button>
          ))}
        </div>
      </section>

      {/* Articles — mixed sizes editorial */}
      <section className="px-5 md:px-10 py-16 md:py-24">
        <div className="grid grid-cols-12 gap-6 md:gap-10">
          {filtered.map((b, i) => {
            // create varied spans for organic feel
            const spans = ['md:col-span-8', 'md:col-span-4', 'md:col-span-6', 'md:col-span-6', 'md:col-span-4', 'md:col-span-8']
            const span = spans[i % spans.length]
            const tall = i % 3 === 1
            return (
              <Reveal key={b.id} className={`col-span-12 ${span}`} delay={i * 0.06}>
                <Link href={`/blogs/${b.id}`} className="group block">
                  <div className={`relative ${tall ? 'aspect-[3/4]' : 'aspect-[4/3]'} overflow-hidden rounded-3xl soft-shadow`}>
                    <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow">{b.category}</p>
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <h3 className="font-serif text-2xl md:text-3xl mt-3 leading-snug group-hover:text-primary transition-colors">{b.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">{b.author} · {b.date} · {b.minutes} min</p>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>
    </div>
  )
}

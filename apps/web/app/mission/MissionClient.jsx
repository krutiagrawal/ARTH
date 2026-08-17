'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { SITE_IMAGES } from '@/lib/siteImages'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

function App() {
  return (
    <div>
      {/* Editorial hero — huge italic manifesto */}
      <section className="pt-40 md:pt-52 pb-16 md:pb-24 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Our Mission</p>
            <Reveal><h1 className="display text-[14vw] md:text-[8.8vw] mt-8 max-w-[16ch]">To plant a forest<br/>we will not live to<br/>see fully <em className="text-primary">grown</em>.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">A statement of intent, made openly, by everyone who has ever cared for a tree.</p>
          </Reveal>
        </div>
      </section>

      {/* Full-bleed image break */}
      <div className="px-5 md:px-10">
        <Reveal>
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl soft-shadow">
            <img src={SITE_IMAGES.people[1]} alt="A quiet planting drive" className="h-full w-full object-cover" />
          </div>
        </Reveal>
      </div>

      {/* Editorial two-column pull */}
      <section className="py-24 md:py-40 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 md:gap-14">
          <Reveal className="col-span-12 md:col-span-6">
            <p className="eyebrow">01 · Why we exist</p>
            <h2 className="font-serif text-4xl md:text-6xl mt-6 leading-tight">We are not a company. We are not a campaign.</h2>
          </Reveal>
          <Reveal className="col-span-12 md:col-span-6 md:pt-16" delay={0.1}>
            <p className="text-lg text-muted-foreground leading-relaxed">We are a slow, worldwide agreement that the earth deserves a hundred million more small kindnesses. ARTH stands for that agreement. It is the ledger, the map and the doorway. It records every tree planted with intention — and every hand that planted it.</p>
          </Reveal>
        </div>
      </section>

      {/* Principles — editorial numbered rows */}
      <section className="py-24 md:py-32 px-5 md:px-10 bg-secondary/60">
        <div className="grid grid-cols-12 gap-6 items-end mb-14 md:mb-24">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Our principles</p>
            <Reveal><h2 className="display text-6xl md:text-8xl mt-6">How we <em className="text-primary">plant</em>.</h2></Reveal>
          </div>
        </div>
        <div className="divide-y divide-foreground/15 border-y border-foreground/15">
          {[
            { n: '01', h: 'With the land', p: 'Only native species. Only local nurseries. No imported monocultures. The plants that belong here already know how to survive here.' },
            { n: '02', h: 'With the people', p: 'Communities lead. NGOs coordinate. CSR supports. Nothing is done to a place — only with it.' },
            { n: '03', h: 'With the truth', p: 'Every drive is photographed and geo-tagged. Every count is public. No greenwashing, ever.' },
          ].map((b, i) => (
            <Reveal key={b.n} delay={i * 0.05}>
              <div className="grid grid-cols-12 gap-6 py-10 md:py-14 items-baseline">
                <span className="col-span-2 md:col-span-1 font-serif italic text-primary text-xl">{b.n}</span>
                <h3 className="col-span-10 md:col-span-4 font-serif text-3xl md:text-5xl">{b.h}</h3>
                <p className="col-span-12 md:col-span-7 text-muted-foreground leading-relaxed max-w-lg md:justify-self-end">{b.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Big quote */}
      <section className="py-32 md:py-48 px-5 md:px-10">
        <Reveal>
          <blockquote className="mx-auto max-w-6xl text-center">
            <p className="font-serif italic text-4xl md:text-7xl leading-[1.05] text-balance">
              &ldquo;A society grows great when old people plant trees whose shade they know they will never sit in.&rdquo;
            </p>
            <footer className="mt-10 eyebrow">A Greek proverb, gently borrowed</footer>
          </blockquote>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="pb-32 px-5 md:px-10">
        <div className="rounded-3xl bg-accent text-accent-foreground p-10 md:p-20 grid grid-cols-12 gap-6 items-end soft-shadow">
          <div className="col-span-12 md:col-span-8">
            <p className="eyebrow text-accent-foreground/70">Your part</p>
            <h3 className="display text-5xl md:text-8xl mt-6">Add your <em className="text-primary">hands</em>.</h3>
          </div>
          <div className="col-span-12 md:col-span-4 md:text-right">
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full bg-background text-foreground pl-6 pr-2 py-2 text-sm">
              Start planting
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
export default App

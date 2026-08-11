'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, ArrowUpRight } from 'lucide-react'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function CompetitionsClient({ competitions }) {
  return (
    <div>
      <section className="pt-36 md:pt-48 pb-12 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Competitions</p>
            <Reveal><h1 className="display text-[14vw] md:text-[9vw] mt-6">Trophies that <em className="text-primary">grow leaves</em>.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">We celebrate the tenderly-kept, the patiently grown, and the beautifully told.</p>
          </Reveal>
        </div>
      </section>

      <section className="px-5 md:px-10 pb-24 md:pb-32">
        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {competitions.map((c, i) => {
            // vary heights for organic feel
            const isTall = i % 3 === 0
            const span = i % 5 === 0 ? 'md:col-span-8' : (i % 3 === 2 ? 'md:col-span-4' : 'md:col-span-6')
            return (
              <Reveal key={c.id} className={`col-span-12 ${span}`} delay={i * 0.04}>
                <Link href={`/competitions/${c.id}`} className="group block overflow-hidden rounded-3xl soft-shadow bg-secondary">
                  <div className={`relative ${isTall ? 'aspect-[3/4]' : 'aspect-[16/10]'} overflow-hidden`}>
                    <img src={c.imageUrl} alt={c.title} className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
                    <div className="absolute inset-x-5 top-5 flex items-center justify-between text-background">
                      <span className="font-serif italic">N° {String(i + 1).padStart(2, '0')}</span>
                      <span className="rounded-full bg-background/90 text-foreground px-2 py-0.5 text-[10px] uppercase tracking-widest inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.deadline}</span>
                    </div>
                    <div className="absolute inset-x-5 bottom-5 text-background">
                      <h2 className="font-serif text-3xl md:text-4xl leading-tight">{c.title}</h2>
                      <p className="mt-2 max-w-md text-sm text-background/85">{c.tagline}</p>
                      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-widest text-background/85">
                        <span>{c.entries.toLocaleString()} entries</span>
                        <span className="inline-flex items-center gap-1">View <ArrowUpRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </div>
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

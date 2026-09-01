'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, ArrowUpRight } from 'lucide-react'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

// Bento tile shapes on a dense grid — fixed row tracks mean every col/row-span
// combo tessellates with no leftover gaps, however the sizes are mixed.
const BENTO_PATTERN = [
  'col-span-2 row-span-2',
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-1 row-span-2',
  'col-span-1 row-span-1',
  'col-span-2 row-span-1',
]

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
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[190px] md:auto-rows-[230px] gap-4 md:gap-6" style={{ gridAutoFlow: 'dense' }}>
          {competitions.map((c, i) => {
            const span = BENTO_PATTERN[i % BENTO_PATTERN.length]
            const roomy = span.includes('2')
            return (
              <Reveal key={c.id} className={span} delay={i * 0.04}>
                <Link href={`/competitions/${c.id}`} className="group relative block h-full w-full overflow-hidden rounded-3xl soft-shadow bg-secondary">
                  <img src={c.imageUrl} alt={c.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent" />
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between text-background">
                    <span className="font-serif italic text-sm">N° {String(i + 1).padStart(2, '0')}</span>
                    {roomy && (
                      <span className="rounded-full bg-background/90 text-foreground px-2 py-0.5 text-[10px] uppercase tracking-widest inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.deadline}</span>
                    )}
                  </div>
                  <div className="absolute inset-x-4 bottom-4 text-background">
                    <h2 className={roomy ? 'font-serif text-2xl md:text-4xl leading-tight' : 'font-serif text-lg leading-tight'}>{c.title}</h2>
                    {roomy && <p className="mt-2 max-w-md text-sm text-background/85 line-clamp-2">{c.tagline}</p>}
                    <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-background/85">
                      {roomy && <span>{c.entriesCount.toLocaleString()} entries</span>}
                      <span className="ml-auto inline-flex items-center gap-1">View <ArrowUpRight className="h-3.5 w-3.5" /></span>
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

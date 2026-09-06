'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin } from 'lucide-react'
import IndiaMap from './IndiaMap'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function ForestsClient({ forests }) {
  const forestsByState = useMemo(() => {
    const map = {}
    for (const f of forests) {
      if (!map[f.state]) map[f.state] = []
      map[f.state].push(f)
    }
    return map
  }, [forests])

  return (
    <div>
      {/* Hero — heading + tagline stacked on the left, the map (the real
          highlight of this page) large on the right, no card chrome around it. */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-4 md:gap-6 items-start">
          <div className="col-span-12 md:col-span-4">
            <p className="eyebrow">Forests</p>
            <Reveal><h1 className="font-serif text-4xl md:text-6xl mt-3 leading-[1.05]">The places we <em className="text-primary not-italic">return</em> to.</h1></Reveal>
            <Reveal delay={0.1}>
              <p className="text-muted-foreground text-base md:text-lg mt-3 max-w-sm">{forests.length} forests and growing, across {Object.keys(forestsByState).length} states. Tap the map to meet the ones near you.</p>
            </Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-8" delay={0.15}>
            <IndiaMap forestsByState={forestsByState} />
          </Reveal>
        </div>
      </section>

      {/* Editorial alternating rows — every forest, in order */}
      <section className="px-5 md:px-10 pb-24 md:pb-32">
        <p className="eyebrow mb-10 md:mb-14">Every forest, so far</p>
        <div className="space-y-20 md:space-y-32">
          {forests.map((f, i) => {
            const flip = i % 2 === 1
            return (
              <Reveal key={f.id}>
                <Link href={`/forests/${f.id}`} className={`group grid grid-cols-12 gap-6 md:gap-10 items-center`}>
                  <div className={`col-span-12 md:col-span-7 ${flip ? 'md:order-2' : ''}`}>
                    <div className="relative aspect-[16/11] overflow-hidden rounded-3xl soft-shadow">
                      <img src={f.imageUrl} alt={f.name} className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
                    </div>
                  </div>
                  <div className={`col-span-12 md:col-span-5 ${flip ? 'md:order-1 md:text-right' : ''}`}>
                    <div className={`flex items-center gap-3 ${flip ? 'md:justify-end' : ''}`}>
                      <span className="font-serif italic text-primary text-xl">{String(i + 1).padStart(2, '0')}</span>
                      <span className="h-px w-10 bg-foreground/25" />
                      <span className="eyebrow flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {f.location}</span>
                    </div>
                    <h2 className="font-serif text-5xl md:text-7xl mt-5 leading-[1]">{f.name}</h2>
                    <p className="mt-5 text-muted-foreground leading-relaxed max-w-md md:ml-auto">{f.story}</p>
                    <div className={`mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm ${flip ? 'md:justify-end' : ''}`}>
                      <span><em className="not-italic font-serif text-2xl">{f.trees.toLocaleString()}</em><span className="eyebrow ml-2">trees</span></span>
                      <span><em className="not-italic font-serif text-2xl">{f.species}</em><span className="eyebrow ml-2">species</span></span>
                      <span><em className="not-italic font-serif text-2xl">{f.volunteers.toLocaleString()}</em><span className="eyebrow ml-2">volunteers</span></span>
                    </div>
                    <div className={`mt-8 inline-flex items-center gap-2 text-sm border-b border-foreground/40 pb-1 group-hover:text-primary transition-colors`}>
                      Visit {f.name} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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

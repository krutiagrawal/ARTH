'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin } from 'lucide-react'

function Reveal({ children, delay = 0, className }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function ForestsClient({ forests }) {
  return (
    <div>
      <section className="pt-36 md:pt-48 pb-12 md:pb-16 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Forests</p>
            <Reveal><h1 className="display text-[14vw] md:text-[9vw] mt-6 max-w-[16ch]">The places we<br/><em className="text-primary">return</em> to.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-3" delay={0.1}>
            <p className="text-muted-foreground max-w-xs">Six featured forests. Not projects — living, breathing places with names and their own quiet weather.</p>
          </Reveal>
        </div>
      </section>

      {/* Editorial alternating rows */}
      <section className="px-5 md:px-10 pb-24 md:pb-32">
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
                      <span className="font-serif italic text-primary text-xl">0{i + 1}</span>
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

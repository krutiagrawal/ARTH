'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { SITE_IMAGES } from '@/lib/siteImages'

function Reveal({ children, delay = 0, y = 24, className }) {
  return <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

export default function AboutClient({ timeline }) {
  const values = [
    { n: '01', h: 'Native first', p: 'We plant with the land, not against it. Every sapling is a species that belongs where it stands.' },
    { n: '02', h: 'Verified impact', p: 'Every tree geo-tagged. Every drive photographed. Every count public and forever open.' },
    { n: '03', h: 'Kind competition', p: 'We celebrate what grows slowly — not what shouts loudly.' },
    { n: '04', h: 'Forever open', p: 'A public archive of trees, hands and hopeful mornings. Free to see, free to join.' },
  ]
  return (
    <div>
      {/* Editorial hero */}
      <section className="pt-36 md:pt-48 pb-16 md:pb-24 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8">
            <p className="eyebrow">About ARTH</p>
            <Reveal><h1 className="display text-[14vw] md:text-[10vw] lg:text-[8.5rem] mt-6 max-w-[16ch]">A quiet <em className="text-primary">global</em> effort.</h1></Reveal>
          </div>
          <Reveal className="col-span-12 md:col-span-4 md:pt-10" delay={0.1}>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">We began with a single banyan on a dry Aravali hill. Everything you see here grew slowly, the way a forest grows.</p>
          </Reveal>
        </div>
      </section>

      {/* Big image break */}
      <div className="px-5 md:px-10">
        <Reveal>
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl soft-shadow">
            <img src={SITE_IMAGES.people[2]} alt="Community planting drive" className="h-full w-full object-cover" />
          </div>
        </Reveal>
      </div>

      {/* Mission / Vision / Belief — asymmetric */}
      <section className="py-24 md:py-32 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-10">
          {[{ n:'M', h:'Mission', p:'To make it easy for anyone — individual, community, company or nation — to plant, verify and cherish native trees for generations.' },{ n:'V', h:'Vision', p:'A public, forever archive of every intentional tree, every person who planted it, every place it grows.' },{ n:'B', h:'Belief', p:'Nature does not need saving. She needs to be given room, and left alone with kindness.' }].map((b, i) => (
            <Reveal key={b.h} className={`col-span-12 md:col-span-4 ${i === 1 ? 'md:pt-12' : ''} ${i === 2 ? 'md:pt-24' : ''}`} delay={i * 0.1}>
              <div className="flex items-center gap-3 mb-6"><span className="font-serif italic text-primary text-4xl">{b.n}</span><span className="h-px w-10 bg-foreground/25" /></div>
              <h3 className="font-serif text-4xl leading-tight">{b.h}</h3>
              <p className="mt-5 text-muted-foreground leading-relaxed">{b.p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values — editorial rows, not cards */}
      <section className="py-24 md:py-32 px-5 md:px-10 bg-secondary/60">
        <div className="grid grid-cols-12 gap-6 items-end mb-14">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Our values</p>
            <Reveal><h2 className="display text-6xl md:text-8xl mt-6">Four quiet <em className="text-primary">promises</em>.</h2></Reveal>
          </div>
        </div>
        <div className="divide-y divide-foreground/15 border-y border-foreground/15">
          {values.map((v, i) => (
            <Reveal key={v.n} delay={i * 0.05}>
              <div className="grid grid-cols-12 gap-6 py-10 md:py-14 items-baseline">
                <span className="col-span-2 md:col-span-1 font-serif italic text-primary text-lg">{v.n}</span>
                <h3 className="col-span-10 md:col-span-4 font-serif text-3xl md:text-5xl">{v.h}</h3>
                <p className="col-span-12 md:col-span-7 text-muted-foreground leading-relaxed max-w-lg md:justify-self-end">{v.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Founder's story */}
      <section className="py-24 md:py-40 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-10 items-center">
          <Reveal className="col-span-12 md:col-span-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl soft-shadow">
              <img src={SITE_IMAGES.people[0]} alt="Founder" className="h-full w-full object-cover" />
            </div>
          </Reveal>
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow">Founder’s story</p>
            <Reveal><h2 className="display text-5xl md:text-7xl mt-6">One banyan.<br/><em className="text-primary">Everything else</em> followed.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 font-serif italic text-2xl leading-relaxed max-w-md">&ldquo;My grandfather planted a banyan the year my father was born. It is still standing. That tree taught me that the best things we make in a lifetime, we do not live to sit fully under.&rdquo;</p>
              <p className="mt-6 eyebrow">Founder, ARTH</p>
              <Link href="/login" className="mt-10 group inline-flex items-center gap-2 rounded-full bg-foreground text-background pl-5 pr-2 py-2 text-sm">Join the movement<span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-3.5 w-3.5" /></span></Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Journey timeline */}
      <section className="py-24 md:py-32 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 items-end mb-14">
          <div className="col-span-12 md:col-span-9">
            <p className="eyebrow">Our journey</p>
            <Reveal><h2 className="display text-5xl md:text-7xl mt-6">How we grew, <em className="text-primary">slowly</em>.</h2></Reveal>
          </div>
        </div>
        <div className="divide-y divide-foreground/15 border-y border-foreground/15">
          {timeline.map((t, i) => (
            <Reveal key={t.year} delay={i * 0.05}>
              <div className="grid grid-cols-12 gap-6 py-10 md:py-14 items-baseline">
                <span className="col-span-3 md:col-span-2 font-serif italic text-primary text-2xl md:text-3xl">{t.year}</span>
                <h3 className="col-span-9 md:col-span-4 font-serif text-2xl md:text-4xl">{t.title}</h3>
                <p className="col-span-12 md:col-span-6 text-muted-foreground max-w-lg md:justify-self-end">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowDown, Leaf, Globe, ShieldCheck, Star, Unlock } from 'lucide-react'
import { SITE_IMAGES } from '@/lib/siteImages'

function Reveal({ children, delay = 0, y = 24, className }) {
  return <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>{children}</motion.div>
}

// Hand-traced organic masks (objectBoundingBox, so they scale with each
// image's own box) matching the reference mockup's photo shapes: the hero
// photo has a concave "wave" on the left and a tail bulge bottom-right
// (which the "worldwide agreement" pill sits inside); the other photos use a
// simpler lopsided-oval blob.
const HeroClip = () => (
  <clipPath id="hero-blob-clip" clipPathUnits="objectBoundingBox">
    <path d="M0.08,0.02 C0.35,0.00 0.65,0.00 0.90,0.02 C0.96,0.03 1.00,0.06 1.00,0.12 L1.00,0.75 C1.00,0.85 1.00,0.95 0.90,0.98 C0.80,1.01 0.65,0.99 0.55,0.97 L0.20,0.95 C0.10,0.94 0.03,0.90 0.02,0.80 C0.01,0.72 0.08,0.68 0.10,0.60 C0.12,0.52 0.04,0.48 0.02,0.40 C0.00,0.30 0.02,0.18 0.05,0.10 C0.06,0.06 0.07,0.04 0.08,0.02 Z" />
  </clipPath>
)
const OvalClip = () => (
  <clipPath id="oval-blob-clip" clipPathUnits="objectBoundingBox">
    <path d="M0.5,0.02 C0.75,0.02 0.95,0.15 0.98,0.42 C1.00,0.65 0.92,0.85 0.72,0.95 C0.55,1.02 0.30,1.00 0.15,0.88 C0.00,0.75 -0.02,0.50 0.05,0.32 C0.12,0.14 0.28,0.02 0.5,0.02 Z" />
  </clipPath>
)
const heroClipStyle = { clipPath: 'url(#hero-blob-clip)' }
const ovalClipStyle = { clipPath: 'url(#oval-blob-clip)' }

const PRINCIPLES = [
  { n: '01', h: 'With the land', p: 'Only native species. Only local nurseries. No imported monocultures – the plants that belong here already know how to survive here.' },
  { n: '02', h: 'With the people', p: 'Communities lead. NGOs coordinate. CSR supports. Nothing is done to a place – only with it.' },
  { n: '03', h: 'With the truth', p: 'Every drive is photographed and geo-tagged. Every count is public. No greenwashing, ever.' },
]

const VALUES = [
  { n: '01', h: 'Native first', p: 'We plant with the land, not against it. Every sapling is a species that belongs where it stands.', icon: Leaf },
  { n: '02', h: 'Verified impact', p: 'Every tree geo-tagged. Every drive photographed. Every count public and forever open.', icon: ShieldCheck },
  { n: '03', h: 'Kind competition', p: 'We celebrate what grows slowly – not what shouts loudly.', icon: Star },
  { n: '04', h: 'Forever open', p: 'A public archive of trees, hands and hopeful mornings. Free to see, free to join.', icon: Unlock },
]

const MVB = [
  { n: 'M', h: 'Mission', p: 'To make it easy for anyone – individual, community, company or nation – to plant, verify and cherish native trees for generations.' },
  { n: 'V', h: 'Vision', p: 'A public, forever archive of every intentional tree, every person who planted it, every place it grows.' },
  { n: 'B', h: 'Belief', p: 'Nature does not need saving. She needs to be given room, and left alone with kindness.' },
]

const JOURNEY = [
  { year: '2026', h: 'A single sapling', p: 'ARTH begins with one banyan, planted on a dry hillside – the first entry in what would become a public archive.' },
  { year: '2026', h: 'The first hands join', p: 'A handful of local nurseries and NGOs come aboard. The idea of a shared, open forest record starts to take shape.' },
  { year: '2026', h: 'A living archive opens', p: 'ARTH goes public – every planter, every tree, every drive, tracked and open for anyone to see.' },
]

const FALLBACK_AVATARS = ['🌱', '🌳', '🍃']

export default function MissionClient({ plantersCount = 0, avatarEmojis = [] }) {
  const avatars = avatarEmojis.length ? avatarEmojis : FALLBACK_AVATARS

  return (
    <div>
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <HeroClip />
          <OvalClip />
        </defs>
      </svg>

      {/* Hero — cream. isolate: keeps the oversized, positioned hero photo from
          painting above the next section's content (a CSS stacking quirk —
          positioned elements otherwise layer above later static siblings
          regardless of DOM order). */}
      <section className="pt-24 md:pt-28 pb-32 md:pb-44 px-5 md:px-10 isolate">
        <div className="grid grid-cols-12 gap-10 items-center">
          <div className="col-span-12 md:col-span-7">
            <p className="eyebrow flex items-center gap-2"><Leaf className="h-3.5 w-3.5 text-primary" aria-hidden /> Our Mission</p>
            <Reveal><h1 className="display text-[12vw] md:text-[5vw] mt-6 max-w-[13ch]">To plant a forest we will not live to see fully <em className="text-primary">grown</em>.</h1></Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 text-lg text-muted-foreground max-w-md">A statement of intent, made openly, by everyone who has ever cared for a tree.</p>
            </Reveal>
            <Reveal delay={0.15} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {avatars.slice(0, 4).map((e, i) => (
                    <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-secondary border-2 border-background text-base">{e}</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{plantersCount.toLocaleString()}+</span> planters around the world
                </p>
              </div>
              <span className="hidden sm:block h-8 w-px bg-foreground/15" aria-hidden />
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-foreground/20"><ArrowDown className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="eyebrow">Scroll</span>
              </div>
            </Reveal>
          </div>

          <div className="col-span-12 md:col-span-5 relative">
            <Reveal>
              <div className="relative aspect-[6/5] soft-shadow scale-[1.4] -translate-x-5 translate-y-5 origin-top-right" style={heroClipStyle}>
                <img src={SITE_IMAGES.people[1]} alt="Planters at work" className="h-full w-full object-cover" />
              </div>
            </Reveal>
            <Reveal delay={0.2} className="absolute -bottom-20 right-0 md:right-2">
              <div className="flex items-center gap-2 rounded-full bg-forest text-forest-foreground pl-3 pr-4 py-2 soft-shadow">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15"><Globe className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="text-xs">A worldwide agreement</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How we plant — pastel sage band, brown accent */}
      <section className="py-24 md:py-32 px-5 md:px-10 bg-primary">
        <div className="grid grid-cols-12 gap-10 md:gap-14">
          <div className="col-span-12 md:col-span-4">
            <p className="eyebrow">How we plant</p>
            <Reveal><h2 className="display text-5xl md:text-6xl mt-6">We plant with what <em className="text-accent">matters</em>.</h2></Reveal>
            <Reveal delay={0.2}>
              <Link href="/register" className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm">
                Add your hands
                <span className="grid h-6 w-6 place-items-center rounded-full bg-background text-foreground"><ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
              </Link>
            </Reveal>
          </div>

          <div className="col-span-12 md:col-span-8">
            <div className="grid sm:grid-cols-3 gap-10 md:gap-8 border-t border-foreground/15 pt-10">
              {PRINCIPLES.map((b, i) => (
                <Reveal key={b.n} delay={i * 0.06}>
                  <p className="eyebrow">{b.n}</p>
                  <h3 className="font-serif text-2xl mt-2">{b.h}</h3>
                  <p className="mt-2.5 text-sm text-foreground/70 leading-relaxed">{b.p}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.25} className="mt-12 md:mt-16 pt-10 border-t border-foreground/15">
              <p className="font-serif italic text-2xl md:text-3xl leading-snug text-balance max-w-2xl">&ldquo;A society grows great when old people plant trees whose shade they know they will never sit in.&rdquo;</p>
              <footer className="mt-5 eyebrow">A Greek proverb, gently borrowed</footer>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Our values — cream */}
      <section id="values" className="py-24 md:py-32 px-5 md:px-10">
        <div className="grid grid-cols-12 gap-14 items-center">
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow">Our values</p>
            <Reveal><h2 className="display text-5xl md:text-6xl mt-6">Four quiet <em className="text-primary">promises</em>.</h2></Reveal>
            <div className="mt-12 grid sm:grid-cols-2 gap-x-8 gap-y-10">
              {VALUES.map((v, i) => (
                <Reveal key={v.n} delay={i * 0.06}>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary"><v.icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-serif text-xl mt-4">{v.h}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.p}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal className="col-span-12 md:col-span-6" delay={0.1}>
            <div className="relative aspect-[4/5] soft-shadow" style={ovalClipStyle}>
              <img src={SITE_IMAGES.people[0]} alt="Community planting together" className="h-full w-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* About ARTH + Mission/Vision/Belief — bold earth-brown band */}
      <section className="py-24 md:py-32 px-5 md:px-10 bg-accent text-accent-foreground">
        <div className="grid grid-cols-12 gap-10 md:gap-14">
          <div className="col-span-12 md:col-span-5">
            <p className="eyebrow text-accent-foreground/60">About ARTH</p>
            <Reveal><h2 className="display text-5xl md:text-6xl mt-6">A quiet <em className="text-primary">global</em> effort.</h2></Reveal>
            <Reveal delay={0.08}>
              <p className="mt-6 text-accent-foreground/80 leading-relaxed max-w-sm">We began with a single banyan on a dry Aravali hill. Everything since then grew slowly, the way a forest grows.</p>
            </Reveal>
          </div>

          <div className="col-span-12 md:col-span-7 grid sm:grid-cols-3 gap-10 md:pt-2">
            {MVB.map((b, i) => (
              <Reveal key={b.n} delay={0.1 + i * 0.06} className="border-t border-accent-foreground/25 pt-6">
                <span className="font-serif italic text-primary text-3xl">{b.n}</span>
                <h3 className="font-serif text-xl mt-3">{b.h}</h3>
                <p className="mt-2 text-sm text-accent-foreground/75 leading-relaxed">{b.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's story — cream */}
      <section className="py-24 md:py-32 px-5 md:px-10 bg-secondary/40">
        <div className="grid grid-cols-12 gap-10 items-center">
          <Reveal className="col-span-12 md:col-span-4">
            <div className="relative aspect-[4/5] soft-shadow" style={ovalClipStyle}>
              <img src={SITE_IMAGES.people[0]} alt="A century-old banyan" className="h-full w-full object-cover" />
            </div>
          </Reveal>

          <div className="col-span-12 md:col-span-8">
            <p className="eyebrow">Founder's story</p>
            <Reveal><h2 className="display text-4xl md:text-6xl mt-4">One banyan. <em className="text-primary">Everything else</em> followed.</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 font-serif italic text-xl md:text-2xl leading-relaxed max-w-xl">&ldquo;My grandmother planted a banyan the year my father was born. It is still standing. That tree taught me that the best things are born in a lifetime, not sit in their shade.&rdquo;</p>
              <p className="mt-5 eyebrow">Founder, ARTH</p>
              <Link href="/register" className="mt-7 group inline-flex items-center gap-2 rounded-full bg-foreground text-background pl-5 pr-2 py-2 text-sm">
                Join the movement
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
              </Link>
            </Reveal>
          </div>
        </div>

        {/* Our journey */}
        <div className="mt-20 md:mt-28 pt-14 border-t border-foreground/15">
          <p className="eyebrow">Our journey</p>
          <Reveal><h2 className="display text-3xl md:text-4xl mt-4">How we grew, <em className="text-primary">slowly</em>.</h2></Reveal>
          <div className="mt-12 grid sm:grid-cols-3 gap-10">
            {JOURNEY.map((j, i) => (
              <Reveal key={i} delay={i * 0.08} className="relative pl-7">
                <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-primary" aria-hidden />
                <p className="font-serif text-lg">{j.year}</p>
                <p className="text-sm mt-0.5">{j.h}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{j.p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

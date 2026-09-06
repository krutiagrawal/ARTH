'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, MapPinned, UploadCloud, Leaf, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/components/site/AuthProvider'

const CHIPS = [
  { icon: Camera, title: 'Live photo', description: 'Real-time capture' },
  { icon: MapPinned, title: 'Location locked', description: 'GPS verified' },
  { icon: UploadCloud, title: 'Instant upload', description: 'Secured on map' },
  { icon: Leaf, title: 'Real impact', description: 'Your tree, Real Earth' },
]

const AVATARS = ['🌱', '🌳', '🍃', '🌿']

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: i * 0.07 } }),
}

function AppleGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.365 1.43c0 1.14-.437 2.06-1.31 2.98-.874.92-1.928 1.42-3.03 1.34-.077-1.13.42-2.09 1.28-3.02.87-.9 2.06-1.42 3.06-1.3zM20.6 17.14c-.53 1.21-1.16 2.4-2.08 3.5-.9 1.09-1.86 2.18-3.16 2.2-1.27.02-1.68-.77-3.13-.77-1.46 0-1.9.75-3.11.79-1.26.04-2.35-1.18-3.26-2.27-1.87-2.24-3.31-6.34-1.39-9.11.96-1.38 2.65-2.26 4.5-2.29 1.24-.02 2.4.83 3.16.83.75 0 2.15-1.03 3.63-.88.62.03 2.36.25 3.48 1.87-.09.06-2.08 1.21-2.06 3.62.02 2.88 2.55 3.84 2.42 3.51z" />
    </svg>
  )
}

function PlayGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3.6 2.3c-.4.2-.6.6-.6 1.1v17.2c0 .5.2.9.6 1.1l9.3-9.7-9.3-9.7z" />
      <path d="M14.9 12l2.9-3-9.5-5.5-.1.1 6.7 8.4z" />
      <path d="M14.9 12l-6.7 8.4.1.1 9.5-5.5-2.9-3z" />
      <path d="M18.6 10.4L15.7 8.6l-2.4 3 2.4 3 2.9-1.7c1-.6 1-1.9 0-2.5z" />
    </svg>
  )
}

function Chip({ icon: Icon, title, description, index }) {
  return (
    <motion.div
      custom={index}
      variants={rise}
      initial="hidden"
      animate="show"
      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 pr-6 soft-shadow transition duration-300 hover:border-primary/50 hover:-translate-y-0.5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.div>
  )
}

export default function PlantClient() {
  const { user } = useAuth()

  return (
    <div className="pt-24 md:pt-28 pb-28">
      <div className="container max-w-7xl">
        <Link href="/" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
        </Link>

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <motion.div variants={rise} initial="hidden" animate="show" className="max-w-xl">
            <p className="eyebrow text-primary">Plant by myself</p>
            <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-3 text-balance">
              Planting happens with a <em className="not-italic text-primary">live camera</em>, on your phone.
            </h1>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              To keep every tree in ARTH real, we don't accept planting from the website — it needs a real-time photo and
              location, captured in the mobile app at the moment you plant.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2.5 rounded-full bg-foreground text-background h-12 px-5 select-none">
                <AppleGlyph className="h-5 w-5" />
                <span className="text-left leading-tight">
                  <span className="block text-[9px] uppercase tracking-wide opacity-70">Download on the</span>
                  <span className="block text-sm font-medium -mt-0.5">App Store</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-foreground text-background h-12 px-5 select-none">
                <PlayGlyph className="h-5 w-5" />
                <span className="text-left leading-tight">
                  <span className="block text-[9px] uppercase tracking-wide opacity-70">GET IT ON</span>
                  <span className="block text-sm font-medium -mt-0.5">Google Play</span>
                </span>
              </span>
            </div>

            <div className="mt-7 inline-flex items-center gap-5 rounded-3xl border border-border/70 bg-card px-5 py-4 soft-shadow">
              <div>
                <p className="font-serif text-2xl leading-none">98,247</p>
                <p className="text-xs text-muted-foreground mt-1.5">Trees planted today</p>
              </div>
              <span className="h-9 w-px bg-border" />
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-3">
                  {AVATARS.map((e, i) => (
                    <span key={i} className="grid h-8 w-8 place-items-center rounded-full bg-secondary border-2 border-background text-sm">{e}</span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">+12k</span>
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Prefer not to plant yourself?{' '}
              <Link href="/adopt" className="text-primary underline-offset-4 hover:underline">Adopt a tree instead</Link>
            </p>
          </motion.div>

          <div className="relative flex items-center justify-center gap-7">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl" aria-hidden />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative w-[248px] shrink-0 rounded-[2.6rem] bg-neutral-900 p-2.5 shadow-[0_40px_80px_-30px_rgba(24,25,18,0.55)]"
            >
              <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[2.1rem]">
                <img
                  src="/assets/ngo-dashboard/impact-sprout.jpg"
                  alt="A seedling photographed for verified planting"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0" style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)',
                  backgroundSize: '33.33% 33.33%',
                }} />

                <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80" />

                <span className="absolute left-4 top-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur px-2.5 py-1 text-[10px] font-medium tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                </span>

                <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/70" aria-hidden />

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-7 pb-5 pt-10 bg-gradient-to-t from-black/75 to-transparent">
                  <RefreshCw className="h-5 w-5 text-white/70" />
                  <span className="grid h-14 w-14 place-items-center rounded-full border-4 border-white/90">
                    <span className="h-10 w-10 rounded-full bg-white" />
                  </span>
                  <ImageIcon className="h-5 w-5 text-white/70" />
                </div>
              </div>
            </motion.div>

            <div className="hidden sm:flex flex-col gap-8">
              {CHIPS.map((c, i) => (
                <Chip key={c.title} {...c} index={i} />
              ))}
              {!user && (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground h-11 px-6 text-sm font-medium hover:bg-primary/90 transition"
                >
                  Create an account
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 sm:hidden">
          <div className="flex flex-col gap-4">
            {CHIPS.map((c, i) => (
              <Chip key={c.title} {...c} index={i} />
            ))}
          </div>
          {!user && (
            <Link
              href="/register"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-primary text-primary-foreground h-12 px-6 text-sm font-medium hover:bg-primary/90 transition"
            >
              Create an account
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Binoculars, Sprout, MapPin, Users, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  { icon: Binoculars, title: 'Discover', text: 'Explore forests, nurseries and drives happening near you. Choose a species that belongs to your soil.' },
  { icon: Sprout, title: 'Plant', text: 'Show up with your hands. Or send a sapling. Every planting is geo-tagged and photographed.' },
  { icon: MapPin, title: 'Track', text: 'Watch your tree grow across years. Height, girth, canopy, health — all logged in one gentle log.' },
  { icon: Users, title: 'Inspire', text: 'Share the story. Earn recognition. Invite your school or company to plant with you.' },
  { icon: TreePine, title: 'Leave a Legacy', text: 'Visit the old. Write your message. Because someone plants today for someone tomorrow.' },
]

function App() {
  return (
    <div className="pt-24 md:pt-28 pb-24">
      <div className="container max-w-7xl">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">Take action</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] mt-3 text-balance">
            <span className="text-primary">Five</span> gentle steps. One <span className="text-primary">growing forest</span>.
          </h1>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Every person on ARTH walks the same slow path. It begins with looking around, and ends with something that outlives you.
          </p>
        </div>

        <div className="relative mt-16 grid grid-cols-2 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
          <div className="hidden lg:block absolute top-9 left-[10%] right-[10%] border-t border-dashed border-border" aria-hidden />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="relative text-center px-2"
            >
              <span className="relative z-10 mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-background border border-border ring-1 ring-primary/20">
                <s.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </span>
              <h3 className="font-serif text-lg mt-5">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button asChild size="lg" className="rounded-full h-12 px-7 bg-foreground text-background hover:bg-foreground/90 shadow-none">
            <Link href="/register">Start Your Journey</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
export default App

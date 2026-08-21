'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Compass, Sprout, LineChart, Sparkles, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionWrapper from '@/components/site/SectionWrapper'

const STEPS = [
  { icon: Compass, title: 'Discover', text: 'Explore forests, nurseries and drives happening near you. Choose a species that belongs to your soil.' },
  { icon: Sprout, title: 'Plant', text: 'Show up with your hands. Or send a sapling. Every planting is geo-tagged and photographed.' },
  { icon: LineChart, title: 'Track', text: 'Watch your tree grow across years. Height, girth, canopy, visits — all kept in one gentle log.' },
  { icon: Sparkles, title: 'Inspire', text: 'Share the story. Enter competitions. Invite your school or company to plant with you.' },
  { icon: TreePine, title: 'Leave a Legacy', text: 'Your tree outlives you. Its shade becomes someone else’s afternoon, a hundred years from now.' },
]

function App() {
  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="How it works" title="Five gentle steps. One growing forest." align="center" lede="Every person on ARTH walks the same slow path. It begins with looking around, and ends with something that outlives you." />
      <div className="container">
        <ol className="relative mx-auto max-w-3xl border-l border-dashed border-border/70 pl-10 space-y-14">
          {STEPS.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6, delay: i * 0.05 }} className="relative">
              <span className="absolute -left-[54px] top-0 grid h-11 w-11 place-items-center rounded-full bg-background border border-border ring-1 ring-primary/20"><s.icon className="h-5 w-5 text-primary" /></span>
              <p className="font-serif text-sm text-primary">Step {i + 1}</p>
              <h3 className="font-serif text-3xl mt-1">{s.title}</h3>
              <p className="mt-2 max-w-lg text-muted-foreground leading-relaxed">{s.text}</p>
            </motion.li>
          ))}
        </ol>
        <div className="mt-20 text-center">
          <Button asChild size="lg" className="rounded-full h-12 px-6"><Link href="/register">Start Your Journey</Link></Button>
        </div>
      </div>
    </div>
  )
}
export default App

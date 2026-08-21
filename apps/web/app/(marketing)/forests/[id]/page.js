import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, TreePine, Users, Sprout, Calendar } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import SectionWrapper from '@/components/site/SectionWrapper'
import { Button } from '@/components/ui/button'

export async function generateMetadata({ params }) {
  const { id } = await params
  const forest = await prisma.forest.findUnique({ where: { id } })
  if (!forest) return {}
  return {
    title: forest.name,
    description: forest.story,
    openGraph: { title: forest.name, description: forest.story, images: [forest.imageUrl] },
  }
}

export default async function App({ params }) {
  const { id } = await params
  const forest = await prisma.forest.findUnique({ where: { id } })
  if (!forest) return notFound()
  const others = (await prisma.forest.findMany({ where: { id: { not: id } } })).slice(0, 3)

  return (
    <div>
      <section className="relative h-[70vh] min-h-[520px]">
        <img src={forest.imageUrl} alt={forest.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-foreground/30 to-background" />
        <div className="relative z-10 container h-full flex flex-col justify-end pb-20 text-background">
          <Link href="/forests" className="mb-6 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"><ArrowLeft className="h-4 w-4" /> All forests</Link>
          <p className="inline-flex items-center gap-1.5 text-sm opacity-90"><MapPin className="h-4 w-4" />{forest.location}</p>
          <h1 className="font-serif text-6xl md:text-8xl leading-[0.95] mt-2">{forest.name}</h1>
          <p className="mt-6 max-w-2xl text-lg opacity-90 leading-relaxed">{forest.story}</p>
        </div>
      </section>

      <section className="container -mt-8 relative z-10">
        <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 soft-shadow">
          {[
            { icon: TreePine, label: 'Trees', value: forest.trees.toLocaleString() },
            { icon: Users, label: 'Volunteers', value: forest.volunteers.toLocaleString() },
            { icon: Sprout, label: 'Species', value: forest.species },
            { icon: Calendar, label: 'Established', value: forest.established },
          ].map(s => (
            <div key={s.label} className="">
              <div className="flex items-center gap-2 text-primary"><s.icon className="h-4 w-4" /><span className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</span></div>
              <div className="font-serif text-3xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <SectionWrapper eyebrow="Field notes" title="What lives here.">
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl">
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>{forest.name} was born the year a handful of people decided to stop describing the problem and start planting the answer.</p>
            <p>Today, it is a living inventory: {forest.species} native species, {forest.trees.toLocaleString()} intentional trees, {forest.volunteers.toLocaleString()} pairs of hands, and thousands of unrecorded visits from birds, insects and the occasional shy mammal.</p>
          </div>
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>The forest is coordinated by a local NGO. Monthly plantation drives are open to volunteers. CSR partners have adopted specific patches and fund seedlings, watering and community caretakers.</p>
            <p>Photographs and geo-tags of every planting are logged. There are no press releases. Only mornings.</p>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link href="/plant">Plant here</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/explore">Explore more forests</Link></Button>
        </div>
      </SectionWrapper>

      <SectionWrapper eyebrow="Nearby" title="Other forests you might love.">
        <div className="grid gap-6 md:grid-cols-3">
          {others.map(o => (
            <Link key={o.id} href={`/forests/${o.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{o.location}</p>
                <h3 className="font-serif text-xl mt-1">{o.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Calendar, TreePine } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import SectionWrapper from '@/components/site/SectionWrapper'
import { Button } from '@/components/ui/button'

export async function generateMetadata({ params }) {
  const { id } = await params
  const t = await prisma.legacyTree.findUnique({ where: { id } })
  if (!t) return {}
  return {
    title: t.name,
    description: t.quote,
    openGraph: { title: t.name, description: t.quote, images: [t.imageUrl] },
  }
}

export default async function App({ params }) {
  const { id } = await params
  const t = await prisma.legacyTree.findUnique({ where: { id } })
  if (!t) return notFound()
  const others = await prisma.legacyTree.findMany({ where: { id: { not: id } } })
  return (
    <div>
      <section className="relative min-h-[80vh] flex items-end">
        <img src={t.imageUrl} alt={t.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-foreground/10" />
        <div className="relative z-10 container pb-20 pt-40 max-w-4xl">
          <Link href="/explore" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Legacy tree</p>
          <h1 className="font-serif text-6xl md:text-8xl leading-[0.95] mt-3 text-balance">{t.name}</h1>
          <p className="mt-6 max-w-2xl font-serif italic text-2xl leading-snug text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
        </div>
      </section>

      <section className="container -mt-6 relative z-10 max-w-4xl">
        <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 leaf-shadow">
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Owner</div><div className="font-serif text-2xl mt-1">{t.owner}</div></div>
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Species</div><div className="font-serif text-xl mt-1 italic">{t.species}</div></div>
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Years alive</div><div className="font-serif text-2xl mt-1">{t.years}</div></div>
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Location</div><div className="font-serif text-xl mt-1">{t.location}</div></div>
        </div>
      </section>

      <SectionWrapper eyebrow="Field diary" title="Small notes across the years.">
        <ol className="relative border-l border-border/70 pl-8 space-y-10 max-w-2xl">
          {[{y:'2024',t:'Fruited unusually early. A small parliament of parakeets moved in.'},{y:'2022',t:'Survived the driest June on record. Watered daily by the neighbours.'},{y:'2019',t:'First hollow appeared. A bee colony took up residence by August.'},{y:'2015',t:'Reached the roof of the house across the lane.'},{y:'2008',t:'Planted, on a Sunday, in a shallow morning rain.'}].map(x => (
            <li key={x.y} className="relative">
              <span className="absolute -left-[41px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/15" />
              <p className="font-serif text-sm text-primary">{x.y}</p>
              <p className="mt-1 text-muted-foreground">{x.t}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10"><Button asChild className="rounded-full"><Link href="/plant">Add your own legacy tree</Link></Button></div>
      </SectionWrapper>

      <SectionWrapper eyebrow="Other legacies" title="Trees people love.">
        <div className="grid gap-6 md:grid-cols-3">
          {others.map(o => (
            <Link key={o.id} href={`/trees/${o.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card leaf-shadow">
              <div className="relative aspect-[4/3] overflow-hidden"><img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" /></div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground italic">{o.species}</p>
                <h3 className="font-serif text-xl mt-1">{o.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

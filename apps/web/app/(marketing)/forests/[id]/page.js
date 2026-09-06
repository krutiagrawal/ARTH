import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, MapPin, TreePine, Users, Sprout, Calendar } from 'lucide-react'
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

const STATS = (forest) => [
  { icon: TreePine, label: 'Trees', value: forest.trees.toLocaleString() },
  { icon: Sprout, label: 'Species', value: forest.species },
  { icon: Users, label: 'Volunteers', value: forest.volunteers.toLocaleString() },
  { icon: Calendar, label: 'Established', value: forest.established },
]

export default async function App({ params }) {
  const { id } = await params
  const forest = await prisma.forest.findUnique({ where: { id } })
  if (!forest) return notFound()
  const pool = (await prisma.forest.findMany({ where: { id: { not: id } } })).sort(() => Math.random() - 0.5)
  const others = pool.slice(0, 3)
  const gallery = pool.slice(3, 12)

  return (
    <div>
      <section className="pt-28 md:pt-36 px-5 md:px-10 pb-20 md:pb-28">
        <Link href="/forests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 md:mb-12">
          <ArrowLeft className="h-4 w-4" /> All forests
        </Link>

        <div className="grid grid-cols-12 gap-8 md:gap-14">
          {/* Image — left, large, stays put while the story scrolls beside it.
              data-navbar-hero: the fixed, normally-transparent Navbar watches for
              this marker to switch to light, shadowed text while a photo (not the
              page's own light background) is behind it — see Navbar.jsx. */}
          <div data-navbar-hero className="col-span-12 md:col-span-6 md:sticky md:top-28 md:self-start">
            <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-3xl soft-shadow">
              <img src={forest.imageUrl} alt={forest.name} className="h-full w-full object-cover" />
            </div>
          </div>

          {/* Story — right, newspaper-feature styling */}
          <div className="col-span-12 md:col-span-6">
            <p className="eyebrow flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{forest.location} · Field dispatch</p>
            <h1 className="font-serif text-5xl md:text-6xl leading-[1.02] mt-3">{forest.name}</h1>

            <p className="mt-8 font-serif italic text-2xl md:text-3xl leading-snug text-foreground border-l-2 border-primary pl-5">
              &ldquo;{forest.story}&rdquo;
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 max-w-sm">
              {STATS(forest).map((s) => (
                <div key={s.label}>
                  <div className="flex items-center gap-2 text-primary"><s.icon className="h-4 w-4" /><span className="eyebrow">{s.label}</span></div>
                  <div className="font-serif text-3xl mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-lg leading-relaxed text-muted-foreground space-y-6 max-w-xl [&>p:first-of-type]:first-letter:font-serif [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-foreground [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:leading-[0.8] [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:mt-1">
              <p>{forest.name} was born the year a handful of people decided to stop describing the problem and start planting the answer. What began as a single planting weekend near {forest.location.replace(', India', '')} has, since {forest.established}, grown into a living inventory: {forest.species} native species, {forest.trees.toLocaleString()} intentional trees, and {forest.volunteers.toLocaleString()} pairs of hands that keep coming back.</p>
              <p>The forest is coordinated by a local NGO working alongside the villages, farms and forest departments that border it. Monthly plantation drives are open to volunteers; CSR partners have adopted specific patches and fund seedlings, watering and community caretakers through the seasons that matter most — the first two dry ones.</p>
              <p>Every planting here is photographed and geo-tagged, not for a press release, but so the next visitor — volunteer, funder, or just curious — can see exactly which tree they're standing under, and how long it has been growing.</p>
              <p>There is no fence around most of it. The forest is meant to be walked through, not just funded — and on any given weekend, someone usually is.</p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild className="rounded-full"><Link href="/plant">Plant here</Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link href="/forests">Explore more forests</Link></Button>
            </div>
          </div>
        </div>

        {/* Gallery — a row of square frames once the big portrait image ends,
            more from the ground rather than one single hero shot. Past 6 photos
            it scrolls horizontally instead of wrapping into more rows. */}
        {gallery.length > 0 && (
          <div className="mt-16 md:mt-24 flex gap-3 md:gap-4 overflow-x-auto pb-2 modern-scrollbar snap-x snap-mandatory">
            {gallery.map((g) => (
              <div key={g.id} className="relative aspect-square w-[calc((100%-2*0.75rem)/3)] md:w-[calc((100%-5*1rem)/6)] shrink-0 snap-start overflow-hidden rounded-2xl soft-shadow">
                <img src={g.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </section>

      <SectionWrapper eyebrow="Nearby" title="Other forests you might love.">
        <div className="grid gap-6 md:grid-cols-3">
          {others.map(o => (
            <Link key={o.id} href={`/forests/${o.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{o.location}</p>
                <h3 className="font-serif text-xl mt-1 flex items-center justify-between gap-2">{o.name} <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

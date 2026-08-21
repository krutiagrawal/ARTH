import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Heart, Users, Sprout, TreePine, Building2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SITE_IMAGES } from '@/lib/siteImages'
import SectionWrapper from '@/components/site/SectionWrapper'
import { Button } from '@/components/ui/button'

const ICONS = { individuals: Heart, communities: Users, ngos: Sprout, nurseries: TreePine, organisations: Building2 }

export async function generateMetadata({ params }) {
  const { id } = await params
  const e = await prisma.ecosystemEntry.findUnique({ where: { id } })
  if (!e) return {}
  return { title: e.title, description: e.description }
}

export default async function App({ params }) {
  const { id } = await params
  const e = await prisma.ecosystemEntry.findUnique({ where: { id } })
  if (!e) return notFound()
  const Icon = ICONS[e.id] || Heart
  return (
    <div className="pt-32">
      <section className="container">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="mt-6 flex items-center gap-4">
          <span className="h-14 w-14 grid place-items-center rounded-full bg-primary/15 text-primary"><Icon className="h-6 w-6" /></span>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">The Ecosystem</p>
        </div>
        <h1 className="mt-4 font-serif text-6xl md:text-8xl leading-[0.95] text-balance">{e.title}</h1>
        <p className="mt-6 max-w-2xl text-xl text-muted-foreground leading-relaxed text-pretty">{e.description}</p>
      </section>

      <SectionWrapper>
        <div className="grid gap-10 md:grid-cols-12 items-start">
          <div className="md:col-span-7 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>{e.long}</p>
            <p>The doorway is deliberately kind: no long forms, no forced verification for those who are just curious. As you plant, your presence on ARTH grows — species you tended, drives you attended, letters you wrote in the journal.</p>
            <p>When you are ready to take on more, more will find you. It is a slow architecture, patterned after the way forests themselves grow.</p>
          </div>
          <div className="md:col-span-5 relative aspect-[4/5] overflow-hidden rounded-3xl soft-shadow">
            <img src={SITE_IMAGES.people[e.id === 'individuals' ? 0 : e.id === 'communities' ? 1 : 2]} alt={e.title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
        <div className="mt-14 flex flex-wrap gap-3">
          <Button asChild className="rounded-full"><Link href="/register">Join as {e.title}</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/how-it-works">How it works</Link></Button>
        </div>
      </SectionWrapper>
    </div>
  )
}

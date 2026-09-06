'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardPageShell from '@/components/dashboard/DashboardPageShell'

export default function ExploreClient({ forests, blogs }) {
  return (
    <DashboardPageShell>
      <div>
        <p className="eyebrow text-primary">Explore</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-2">Places you&rsquo;ve touched, and stories worth reading.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg">
          Curated forests from across the ARTH network, and the journal — updated as the movement grows.
        </p>
      </div>

      <Tabs defaultValue="forests">
        <TabsList className="h-10 rounded-full bg-secondary p-1">
          <TabsTrigger value="forests" className="rounded-full px-4">Forests</TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full px-4">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="forests" className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {forests.map((f) => (
              <Link
                key={f.id}
                href={`/forests/${f.id}`}
                className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={f.imageUrl}
                    alt={f.name}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {f.location}
                  </p>
                  <h3 className="font-serif text-xl mt-1">{f.name}</h3>
                  <p className="text-xs text-muted-foreground mt-2">
                    {f.trees.toLocaleString()} trees · {f.species} species
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((b) => (
              <Link
                key={b.id}
                href={`/blogs/${b.id}`}
                className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow transition hover:border-primary/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest text-primary">{b.category}</p>
                  <h3 className="font-serif text-lg mt-1 leading-snug">{b.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  )
}

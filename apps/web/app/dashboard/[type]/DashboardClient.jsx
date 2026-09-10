'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import SectionWrapper from '@/components/site/SectionWrapper'
import AnimatedCounter from '@/components/site/AnimatedCounter'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/site/AuthProvider'
import { proxy } from '@/lib/memberProxy'

// Serves group/ngo/nursery/corporate only — 'individual' now lives at the
// static apps/web/app/dashboard/individual/* route tree, which Next.js
// shadows ahead of this dynamic segment (see [type]/page.js VALID_TYPES).
// Of these, only 'corporate' is actually linked anywhere today
// (app/(marketing)/HomeClient.jsx) — group/ngo have their own dedicated
// dashboards at /group/dashboard, /ngo/dashboard.
const ROLE_LABEL = {
  group: 'Group',
  ngo: 'NGO',
  nursery: 'Nursery',
  corporate: 'CSR Partner',
}

export default function DashboardClient({ type, forests, blogs }) {
  const { user } = useAuth()
  const role = ROLE_LABEL[type]
  const firstName = user?.name?.split(' ')[0] || 'there'
  const [drivesJoined, setDrivesJoined] = useState(null)

  useEffect(() => {
    proxy('/drives')
      .then((drives) => setDrivesJoined(drives.filter((d) => d.isRsvped).length))
      .catch(() => setDrivesJoined(0))
  }, [])

  const statCards = [
    { l: 'Trees planted', v: user?.treesPlantedCount ?? 0 },
    { l: 'XP', v: user?.xp ?? 0 },
    { l: 'Level', v: user?.level ?? 1 },
    { l: 'Drives joined', v: drivesJoined ?? 0 },
  ]

  return (
    <div className="pt-32">
      <section className="container">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Dashboard · {role}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1] text-balance">Welcome back, {firstName}.</h1>
            <p className="mt-3 text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> {user?.handle ? `@${user.handle}` : '–'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full"><Link href="/explore">Explore</Link></Button>
            <Button asChild className="rounded-full"><Link href="/plant">Plant today</Link></Button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          {statCards.map(s => (
            <div key={s.l} className="rounded-3xl border border-border/70 bg-card p-6 soft-shadow">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
              <div className="font-serif text-4xl mt-2"><AnimatedCounter value={s.v} /></div>
            </div>
          ))}
        </div>
      </section>

      <SectionWrapper eyebrow="Your forests" title="Places you have touched.">
        <div className="grid gap-6 md:grid-cols-3">
          {forests.map(f => (
            <Link key={f.id} href={`/forests/${f.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={f.imageUrl} alt={f.name} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{f.location}</p>
                <h3 className="font-serif text-xl mt-1">{f.name}</h3>
                <p className="text-xs text-muted-foreground mt-2">{f.trees.toLocaleString()} trees · {f.species} species</p>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper eyebrow="Reading" title="From the journal.">
        <div className="grid gap-6 md:grid-cols-3">
          {blogs.map(b => (
            <Link key={b.id} href={`/blogs/${b.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow">
              <div className="relative aspect-[4/3] overflow-hidden"><img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" /></div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest text-primary">{b.category}</p>
                <h3 className="font-serif text-lg mt-1 leading-snug">{b.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

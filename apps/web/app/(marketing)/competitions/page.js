// TODO(post-launch): re-enable competitions. Disabled before launch because a
// competition with a handful of seeded/fake entries looks worse than no
// competition at all — bring this back once there's a real base of active
// planters who can actually enter and vote. To restore: delete the stub
// below and uncomment the original implementation.

export const metadata = {
  title: 'Competitions',
  description: 'Join ARTH competitions and challenges — plant, document and compete for the movement.',
}

export default function Page() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 text-center pt-20">
      <div>
        <p className="eyebrow">Competitions</p>
        <h1 className="font-serif text-4xl md:text-6xl mt-4">Coming soon.</h1>
        <p className="mt-4 text-muted-foreground max-w-md mx-auto">
          We&rsquo;re saving the trophies for when there&rsquo;s a real crowd to compete against. Check back after launch.
        </p>
      </div>
    </div>
  )
}

/* ORIGINAL IMPLEMENTATION — restore after launch:

import { prisma } from '@/lib/prisma'
import CompetitionsClient from './CompetitionsClient'

export const metadata = {
  title: 'Competitions',
  description: 'Join ARTH competitions and challenges — plant, document and compete for the movement.',
}

export default async function Page() {
  const competitions = await prisma.competition.findMany({ orderBy: { deadline: 'asc' } })
  const serialised = competitions.map((c) => ({ ...c, deadline: c.deadline.toISOString().slice(0, 10) }))
  return <CompetitionsClient competitions={serialised} />
}

*/

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import SectionWrapper from '@/components/site/SectionWrapper'

export default function BlogDetailClient({ blog: b, others }) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(482 + b.minutes * 11)

  return (
    <article>
      <section className="relative h-[70vh] min-h-[520px]">
        <img src={b.imageUrl} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-foreground/40 to-background" />
        <div className="relative z-10 container h-full flex flex-col justify-end pb-16 text-background max-w-4xl">
          <Link href="/blogs" className="mb-6 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100"><ArrowLeft className="h-4 w-4" /> Journal</Link>
          <p className="text-xs uppercase tracking-[0.22em] opacity-80">{b.category} · {b.minutes} min read</p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.98] mt-3 text-balance">{b.title}</h1>
          <p className="mt-5 opacity-90">By {b.author} · {b.date}</p>
        </div>
      </section>

      <div className="container max-w-3xl py-16 md:py-24 space-y-6 text-lg leading-relaxed text-foreground/90">
        <p className="font-serif italic text-2xl leading-snug text-muted-foreground">{b.excerpt}</p>
        <p>In the first light, when the mist still hangs low over the fields, the world seems briefly convinced that no one is watching. The birds move as if remembered from a longer century. The trees, patient as they always are, wait for their part.</p>
        <p>Restoration is not built from headlines. It is built from mornings like this — the small, unphotographed hours when someone chooses to dig one more hole, to carry one more bucket of water, to sit beside a sapling for an afternoon and mean it.</p>
        <p>The species that returns first is often the species that was quietest before. We watched a Malabar whistling thrush arrive nine months after we planted the first hundred jamun. It did not sing for anyone in particular. It sang because the branch was there.</p>
        <blockquote className="border-l-2 border-primary/60 pl-6 font-serif italic text-2xl text-pretty">A forest is a place that remembers being planted.</blockquote>
        <p>We often think of this work as a race against loss. But the trees do not run. They rehearse a slower argument — the argument that time, kept faithfully, is enough.</p>
        <p>Come back in ten years. Sit under this canopy. Tell us if you think we were wrong.</p>
      </div>

      <div className="container max-w-3xl flex items-center gap-4 pb-12">
        <button onClick={() => { setLiked(v => !v); setCount(c => c + (liked ? -1 : 1)) }} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${liked ? 'bg-destructive/10 border-destructive text-destructive' : 'border-border hover:bg-secondary'}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-destructive' : ''}`} /> {count.toLocaleString()} likes
        </button>
      </div>

      <SectionWrapper eyebrow="Keep reading" title="More slow walks.">
        <div className="grid gap-6 md:grid-cols-3">
          {others.map(o => (
            <Link key={o.id} href={`/blogs/${o.id}`} className="group overflow-hidden rounded-3xl border border-border/70 bg-card leaf-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={o.imageUrl} alt={o.title} className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-[10px] uppercase tracking-widest text-primary">{o.category}</p>
                <h3 className="font-serif text-xl mt-1 leading-snug">{o.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </SectionWrapper>
    </article>
  )
}

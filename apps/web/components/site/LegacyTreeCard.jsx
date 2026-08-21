'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LegacyTreeCard({ tree }) {
  return (
    <motion.article
      whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow"
    >
      <Link href={`/trees/${tree.id}`} className="grid md:grid-cols-2">
        <div className="relative aspect-[4/5] md:aspect-auto">
          <img src={tree.imageUrl} alt={tree.name} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Legacy Tree</p>
            <h3 className="font-serif text-3xl mt-3 leading-tight">{tree.name}</h3>
            <p className="mt-4 font-serif italic text-lg text-muted-foreground leading-relaxed">&ldquo;{tree.quote}&rdquo;</p>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Owner</dt><dd>{tree.owner}</dd>
            <dt className="text-muted-foreground">Years alive</dt><dd>{tree.years}</dd>
            <dt className="text-muted-foreground">Species</dt><dd className="italic">{tree.species}</dd>
            <dt className="text-muted-foreground">Location</dt><dd>{tree.location}</dd>
          </dl>
        </div>
      </Link>
    </motion.article>
  )
}

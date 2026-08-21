'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPin, TreePine, Users, Sprout, Calendar, ArrowUpRight } from 'lucide-react'

export default function ForestCard({ forest, priority }) {
  return (
    <motion.div
      whileHover={{ y: -4, rotate: -0.2 }} transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card soft-shadow"
    >
      <Link href={`/forests/${forest.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={forest.imageUrl} alt={forest.name} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-background">
            <div className="flex items-center gap-1.5 text-xs opacity-90"><MapPin className="h-3.5 w-3.5" />{forest.location}</div>
            <h3 className="font-serif text-2xl mt-1">{forest.name}</h3>
          </div>
          <div className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full bg-background/85 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><TreePine className="h-3.5 w-3.5 text-primary" />{forest.trees.toLocaleString()} trees</div>
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" />{forest.volunteers.toLocaleString()}</div>
          <div className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5 text-primary" />{forest.species} species</div>
        </div>
      </Link>
    </motion.div>
  )
}

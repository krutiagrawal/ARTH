'use client'
import { cn } from '@/lib/utils'

export default function Marquee({ items = [], className, slow = false, separator = '–', dot = true }) {
  const row = (
    <div className="flex items-center gap-10 md:gap-16 shrink-0 pr-10 md:pr-16">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-10 md:gap-16 shrink-0">
          <span className="font-serif text-3xl md:text-5xl lg:text-6xl italic tracking-tight whitespace-nowrap">{it}</span>
          {dot && <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
        </div>
      ))}
    </div>
  )
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className={cn('flex', slow ? 'animate-marquee-slow' : 'animate-marquee')}>
        {row}{row}
      </div>
    </div>
  )
}

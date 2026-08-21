import Link from 'next/link'
import Image from 'next/image'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Dark "Impact snapshot" panel — the one deliberately different-colored
 * surface in the dashboard (uses --forest-deep, not --primary/--card).
 * `metrics`: [{ icon, value, label }]
 * `image`: optional photo bleeding off the bottom-right edge (falls back to
 * a decorative inline sprout if omitted).
 */
export default function ImpactPanel({ title, subtitle, metrics, image, ctaHref, ctaLabel }) {
  return (
    <div className="h-full flex flex-col rounded-3xl bg-forest text-forest-foreground p-6 soft-shadow relative overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
          <Leaf className="h-4 w-4" />
        </span>
        <div>
          <p className="font-serif text-lg">{title}</p>
          {subtitle && <p className="text-sm text-forest-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-5 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-5 content-start relative z-10 max-w-md">
        {metrics.map((m) => (
          <div key={m.label}>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 mb-1.5">
              <m.icon className="h-3 w-3" />
            </span>
            <p className="font-serif text-xl leading-none">{m.value}</p>
            <p className="mt-1 text-xs text-forest-foreground/70">{m.label}</p>
          </div>
        ))}
      </div>

      {image ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-4 h-40 w-40 overflow-hidden rounded-[45%_55%_60%_40%/55%_45%_55%_45%] opacity-70 mix-blend-luminosity"
        >
          <Image src={image} alt="" fill sizes="160px" className="object-cover" />
        </div>
      ) : (
        // Decorative sprout, bleeding off the bottom-right edge
        <svg
          aria-hidden="true"
          viewBox="0 0 200 220"
          className="pointer-events-none absolute -right-6 -bottom-6 h-56 w-56 opacity-25"
          fill="none"
        >
          <path d="M100 220 L100 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M100 130 C60 130 40 100 40 60 C80 60 100 90 100 130 Z" fill="currentColor" />
          <path d="M100 100 C140 100 160 70 160 30 C120 30 100 60 100 100 Z" fill="currentColor" />
          <path d="M100 220 C130 220 150 210 155 195 C130 195 108 205 100 220 Z" fill="currentColor" />
        </svg>
      )}

      {ctaHref && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-6 self-start rounded-full border-white/40 text-forest-foreground bg-transparent hover:bg-white/10 hover:text-forest-foreground relative z-10"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  )
}

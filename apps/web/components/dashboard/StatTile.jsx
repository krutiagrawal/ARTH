'use client'

import { useId } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const TONE_STYLES = {
  primary: {
    badge: 'bg-primary/15 text-primary',
    arrow: 'bg-primary/15 text-primary hover:bg-primary/25',
    spark: 'hsl(var(--primary))',
  },
  sand: {
    badge: 'bg-sand/25 text-accent',
    arrow: 'bg-sand/25 text-accent hover:bg-sand/35',
    spark: 'hsl(var(--sand))',
  },
}

/**
 * A single stat card for dashboard Overview grids.
 * `sparklineData`: optional array of `{ value }` points, shown inline next
 * to the value rather than in a separate footer row — keeps the card short.
 * `tone`: 'primary' | 'sand' — alternates card accent color across a grid.
 * `href`: optional — renders a small circular arrow-link button next to
 * `description`.
 */
export default function StatTile({
  label,
  value,
  icon: Icon,
  description,
  tone = 'primary',
  href,
  sparklineData,
  loading = false,
  className,
}) {
  const gradientId = useId()
  const styles = TONE_STYLES[tone] || TONE_STYLES.primary

  if (loading) {
    return (
      <div className={cn('rounded-3xl border border-border/70 bg-card p-5 soft-shadow', className)}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-3xl border border-border/70 bg-card p-5 soft-shadow flex flex-col', className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', styles.badge)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="eyebrow">{label}</span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-serif text-2xl leading-none">{value}</p>
        {sparklineData && sparklineData.length > 1 && (
          <div className="h-6 w-14 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={styles.spark} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={styles.spark} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={styles.spark}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        {href && (
          <Link
            href={href}
            className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors', styles.arrow)}
          >
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

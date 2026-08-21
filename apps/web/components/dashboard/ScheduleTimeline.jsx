import { cn } from '@/lib/utils'

const TONE_ICON = {
  primary: 'bg-primary/15 text-primary',
  sand: 'bg-sand/25 text-accent',
}

/**
 * Vertical timeline list — pairs with ScheduleCalendar. `events`:
 * [{ time, title, subtitle, icon, color: 'primary' | 'sand' }]
 */
export default function ScheduleTimeline({ events }) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">No upcoming drives scheduled.</p>
  }

  return (
    <div className="relative space-y-5">
      <div className="absolute left-4 top-1 bottom-1 w-px bg-border" aria-hidden="true" />
      {events.map((event, i) => (
        <div key={i} className="relative flex items-start gap-3 pl-0">
          <span
            className={cn(
              'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full',
              TONE_ICON[event.color] || TONE_ICON.primary
            )}
          >
            <event.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-xs text-muted-foreground">{event.time}</p>
            <p className="text-sm font-medium truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground">{event.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'

import { Calendar } from '@/components/ui/calendar'

/**
 * Thin wrapper around the existing (previously unused) shadcn Calendar
 * primitive. `selected={today}` alone gets the mockup's filled-circle
 * "today" treatment for free — the primitive's DayButton already maps
 * `data-selected-single` to bg-primary/text-primary-foreground.
 * `eventDates`: Date[] — days that get a small dot marker (upcoming drives).
 */
export default function ScheduleCalendar({ eventDates = [] }) {
  const today = new Date()

  return (
    // Centering wrapper, not a classNames override on the primitive itself —
    // Calendar's internal classNames prop *replaces* whole default class
    // strings per-key rather than merging them, so overriding e.g. `root`/
    // `month` there risks dropping react-day-picker's own structural classes.
    <div className="flex justify-center">
      <Calendar
        mode="single"
        selected={today}
        defaultMonth={today}
        modifiers={{ hasEvent: eventDates }}
        modifiersClassNames={{
          hasEvent:
            'relative after:content-[\'\'] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary',
        }}
        className="bg-transparent p-0 [--cell-size:2.25rem]"
      />
    </div>
  )
}

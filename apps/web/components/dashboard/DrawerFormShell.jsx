'use client'

import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'

/**
 * Shared right-side drawer shell for create/edit forms (replaces the old
 * centered Dialog forms). Gives every form drawer the same banner + scrollable
 * sectioned body + sticky footer structure so new forms stay consistent.
 */
export default function DrawerFormShell({
  open,
  onOpenChange,
  icon: Icon,
  eyebrow,
  title,
  description,
  widthClassName = 'w-full sm:max-w-lg',
  footer,
  children,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('flex flex-col gap-0 p-0', widthClassName)}>
        <div className="relative isolate shrink-0 overflow-hidden bg-primary px-5 py-4">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-12 -bottom-16 h-32 w-32 rounded-full bg-black/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/10" />
          <div className="relative flex items-center gap-3 pr-6">
            {Icon && (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-foreground text-primary shadow-md">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">{eyebrow}</p>}
              <SheetTitle className="mt-0.5 truncate font-serif text-lg font-normal leading-tight text-primary-foreground">{title}</SheetTitle>
              {description && <SheetDescription className="mt-0.5 text-xs leading-snug text-primary-foreground/80">{description}</SheetDescription>}
            </div>
          </div>
        </div>

        <div className="modern-scrollbar flex-1 overflow-y-auto bg-secondary/20 px-5 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border/70 bg-background px-5 py-3">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 sm:gap-0">{footer}</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Card-grouped set of fields inside a DrawerFormShell body. */
export function FormSection({ label, children, first = false }) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-background p-3.5 shadow-sm', !first && 'mt-3')}>
      {label && <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">{label}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/** Compact field label used above inputs inside a DrawerFormShell form. */
export function FieldLabel({ required, children }) {
  return (
    <span className="text-[11px] font-medium text-muted-foreground">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  )
}

/** Read-only label/value row for detail (non-form) sheets — pairs with FormSection. */
export function DetailRow({ label, children, full = false }) {
  if (children == null || children === '') return null
  return (
    <div className={cn(full && 'col-span-2')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-[13px] leading-snug text-foreground">{children}</div>
    </div>
  )
}

/** Grid wrapper for a set of DetailRows within a FormSection — 2 columns on wider drawers. */
export function DetailGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-3">{children}</div>
}

// Explicit small radius, not the theme's `rounded-lg`/`rounded-md` (those
// resolve off `--radius: 1.1rem`, tuned for cards/pill buttons — on a 36px
// input that reads as a stadium/pill shape, not a compact modern form field).
export const fieldInputClassName =
  'mt-1 h-8 w-full rounded-[8px] border border-border/70 bg-background px-2.5 text-[13px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
export const fieldTextareaClassName =
  'mt-1 w-full rounded-[8px] border border-border/70 bg-background px-2.5 py-2 text-[13px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
export const fieldButtonClassName = 'h-8 rounded-[8px] px-3 text-xs'

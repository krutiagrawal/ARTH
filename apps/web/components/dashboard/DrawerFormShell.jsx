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
        <div className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-background px-5 py-4">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{eyebrow}</p>}
            <SheetTitle className="truncate text-base font-semibold leading-tight text-foreground">{title}</SheetTitle>
            {description && <SheetDescription className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</SheetDescription>}
          </div>
        </div>

        <div className="modern-scrollbar flex-1 overflow-y-auto bg-muted/30 px-5 py-5">{children}</div>

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

/**
 * Single elevated panel that holds every section of a read-only detail
 * sheet — sections are divided by hairlines instead of each being its own
 * bordered/shadowed card, so a multi-section drawer reads as one coherent
 * document rather than a stack of boxes.
 */
export function DetailPanel({ children }) {
  return <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background shadow-sm">{children}</div>
}

/** One section inside a DetailPanel — label + content, no border of its own. */
export function DetailSection({ label, children }) {
  return (
    <div className="p-4">
      {label && <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</p>}
      <div className="space-y-3.5">{children}</div>
    </div>
  )
}

/** Read-only label/value row for detail (non-form) sheets — pairs with DetailSection. */
export function DetailRow({ label, children, full = false }) {
  if (children == null || children === '') return null
  return (
    <div className={cn(full && 'col-span-2')}>
      <p className="text-[12px] text-muted-foreground/80">{label}</p>
      <div className="mt-1 text-[14px] leading-relaxed text-foreground">{children}</div>
    </div>
  )
}

/** Grid wrapper for a set of DetailRows within a DetailSection — 2 columns on wider drawers. */
export function DetailGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>
}

/** Flat, divided list for detail sheets (attendees, donors, pickup points…) —
 * replaces one-bordered-box-per-row with subtle dividers so a list of many
 * items doesn't read as a stack of nested cards. */
export function DetailList({ children }) {
  return <div className="divide-y divide-border/50">{children}</div>
}

// Explicit small radius, not the theme's `rounded-lg`/`rounded-md` (those
// resolve off `--radius: 1.1rem`, tuned for cards/pill buttons — on a 36px
// input that reads as a stadium/pill shape, not a compact modern form field).
export const fieldInputClassName =
  'mt-1 h-8 w-full rounded-[8px] border border-border/70 bg-background px-2.5 text-[13px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
export const fieldTextareaClassName =
  'mt-1 w-full rounded-[8px] border border-border/70 bg-background px-2.5 py-2 text-[13px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
export const fieldButtonClassName = 'h-8 rounded-[8px] px-3 text-xs'

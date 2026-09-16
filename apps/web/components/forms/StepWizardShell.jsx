'use client'

import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

/**
 * Generic step-wizard chrome (progress dots, step counter, title/subtitle, back/continue nav) —
 * genuinely new for web, since every public registration form here today is a single page.
 * Content-agnostic: the current step's fields are passed in as `children`.
 */
export default function StepWizardShell({
  stepIndex,
  stepCount,
  emoji,
  title,
  subtitle,
  error,
  onBack,
  onNext,
  nextLabel = 'Continue',
  submitting = false,
  children,
}) {
  return (
    <div className="mt-10">
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: stepCount }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === stepIndex ? 'w-6 bg-primary' : i < stepIndex ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Step {stepIndex + 1} of {stepCount}
      </p>

      <div className="mt-6 rounded-3xl border border-border bg-background/60 p-6 md:p-8">
        <h2 className="font-serif text-2xl">
          {emoji} {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}

        <div className="mt-6 space-y-4">{children}</div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="h-11 rounded-full px-5 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="flex-1 h-11 rounded-full bg-foreground text-background text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : nextLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

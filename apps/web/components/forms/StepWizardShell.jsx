'use client'

import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'

/**
 * Generic step-wizard chrome (progress bar, step counter, title/subtitle, back/continue nav).
 * Content-agnostic: the current step's fields are passed in as `children`. Steps slide in the
 * direction of travel, the progress bar fills smoothly and validation errors shake into view.
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
  const prevIndex = useRef(stepIndex)
  const direction = stepIndex >= prevIndex.current ? 1 : -1
  prevIndex.current = stepIndex

  const progress = ((stepIndex + 1) / stepCount) * 100

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Step {stepIndex + 1} <span className="opacity-60">of {stepCount}</span>
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-background/60 p-6 shadow-sm md:p-8">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={stepIndex}
            custom={direction}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 32 }),
              center: { opacity: 1, x: 0 },
              exit: (d) => ({ opacity: 0, x: d * -32 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-4 border-b border-border/70 pb-5">
              <motion.span
                initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.1 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl"
              >
                {emoji}
              </motion.span>
              <div>
                <h2 className="font-serif text-2xl leading-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>

            <div className="mt-6 space-y-6">{children}</div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              key={error}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center gap-3">
          {stepIndex > 0 && (
            <motion.button
              type="button"
              onClick={onBack}
              disabled={submitting}
              whileTap={{ scale: 0.95 }}
              className="h-11 rounded-full px-5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              ← Back
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={onNext}
            disabled={submitting}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-sm text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : nextLabel}
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

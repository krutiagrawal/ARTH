'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function SectionWrapper({ children, className, id, eyebrow, title, lede, align = 'left' }) {
  return (
    <section id={id} className={cn('relative py-20 md:py-28', className)}>
      <div className="container">
        {(eyebrow || title || lede) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn('mb-12 md:mb-16 max-w-3xl', align === 'center' && 'mx-auto text-center')}
          >
            {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.22em] text-primary/90">{eyebrow}</p>}
            {title && <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-balance">{title}</h2>}
            {lede && <p className="mt-5 text-lg text-muted-foreground text-pretty leading-relaxed">{lede}</p>}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  )
}

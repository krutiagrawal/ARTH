'use client'

import { AnimatePresence, motion } from 'framer-motion'

/** Smoothly expands/collapses its children when `show` flips. */
export default function Reveal({ show, children, className }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="reveal"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className={className}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// Elegant cursor: a small ring + leaf that softly follows.
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [hover, setHover] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 400, damping: 40, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 400, damping: 40, mass: 0.4 })
  const dotX = useSpring(x, { stiffness: 900, damping: 50, mass: 0.2 })
  const dotY = useSpring(y, { stiffness: 900, damping: 50, mass: 0.2 })

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return
    setEnabled(true)
    const move = (e) => { x.set(e.clientX); y.set(e.clientY) }
    const over = (e) => {
      const t = e.target
      const interactive = t.closest('a, button, [role=button], input, textarea, select, .cursor-interactive')
      setHover(!!interactive)
    }
    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over) }
  }, [x, y])

  if (!enabled) return null
  return (
    <>
      {/* mix-blend-difference relies on the cursor sharing a stacking context with
          everything beneath it — this page has many transformed/blurred/opacity-
          animated layers (glass cards, GSAP-tweened captions) that each create
          their own stacking context, so the blend silently stopped applying against
          large parts of the hero and the cursor went invisible over light footage.
          A dual-ring outline (light ring + dark ring, offset by 1px) sidesteps that
          entirely: one of the two rings is always high-contrast against any
          backdrop, light or dark, with no dependency on blend-mode compositing. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[100] top-0 left-0"
        style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%' }}
      >
        <motion.div
          animate={{ scale: hover ? 1.9 : 1, opacity: hover ? 0.95 : 0.85 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="h-8 w-8 rounded-full border-[1.5px] border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.9)]"
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-[100] top-0 left-0"
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
      >
        <motion.div animate={{ scale: hover ? 0 : 1 }} className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.9)]" />
      </motion.div>
    </>
  )
}

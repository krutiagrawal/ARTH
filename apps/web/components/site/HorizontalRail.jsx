'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HorizontalRail({ children, ariaLabel = 'Horizontal gallery', showControls = true }) {
  const ref = useRef(null)
  const scrollBy = (dir) => {
    const el = ref.current; if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }
  return (
    <div className="relative">
      <div ref={ref} role="region" aria-label={ariaLabel}
        className="no-scrollbar -mx-6 md:-mx-8 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 md:px-8 pb-2">
        {children}
      </div>
      {showControls && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:flex items-center justify-between px-1">
          <button aria-label="Scroll left" onClick={() => scrollBy(-1)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-background/85 border border-border backdrop-blur hover:bg-background transition soft-shadow">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button aria-label="Scroll right" onClick={() => scrollBy(1)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-background/85 border border-border backdrop-blur hover:bg-background transition soft-shadow">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

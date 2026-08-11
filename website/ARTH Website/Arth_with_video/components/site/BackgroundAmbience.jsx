'use client'
import { useEffect, useState } from 'react'

// Floating pollen particles + occasional bird silhouettes. Absolute fixed layer, non-interactive.
export default function BackgroundAmbience() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const pollen = Array.from({ length: 18 }).map((_, i) => {
    const size = 3 + Math.random() * 5
    return {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size,
      delay: -Math.random() * 8,
      dur: 8 + Math.random() * 8,
    }
  })

  const birds = Array.from({ length: 3 }).map((_, i) => ({
    top: `${8 + Math.random() * 42}%`,
    delay: -Math.random() * 30,
    dur: 38 + Math.random() * 30,
    scale: 0.6 + Math.random() * 0.6,
  }))

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {pollen.map((p, i) => (
        <span key={i} className="absolute rounded-full bg-primary/25 animate-float-slow blur-[1px]"
          style={{
            left: p.left, top: p.top, width: p.size, height: p.size,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
          }} />
      ))}
      {birds.map((b, i) => (
        <svg key={i} viewBox="0 0 40 20" className="absolute text-foreground/25"
          style={{ top: b.top, left: 0, width: 28 * b.scale, animation: `drift ${b.dur}s linear infinite`, animationDelay: `${b.delay}s` }}>
          <path d="M2 10 Q 8 2 14 10 Q 20 2 26 10 Q 32 2 38 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ))}
      {/* soft warm sunlight blob */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
    </div>
  )
}

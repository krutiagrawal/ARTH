'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronRight, Sprout, MapPin, Users, Heart, Tag, ScrollText, TrendingUp, User, Building2, TreePine, Bird, Leaf } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/* ==================================================================================
   ARTH — The Life of a Tree
   ------------------------------------------------------------------------------
   ONE continuous cinematic shot, driven by a single GSAP master timeline.
   Scroll = playback scrubber: the background is a pre-extracted sequence of still
   frames drawn to a <canvas>, with the current frame selected by scroll position
   (forward on scroll down, backward on scroll up). This replaces an earlier
   <video>.currentTime-scrubbing approach — video seeking has a hard latency floor
   for rapid bidirectional scrubbing (decode-chain-per-seek); drawing a preloaded
   still image is instant, so this is the smooth version.

   TIMELINE SCALE: everything below is authored on an abstract 0–1000 axis.
   GSAP maps that 0–1000 range onto the scroll distance defined by SCROLL_VH,
   and the same axis maps linearly onto the frame sequence (0..FRAME_COUNT-1).
   ================================================================================== */

const ASSET = (name) => `/assets/homepage/${name}`
// 4200 (up from 3000): the homepage now carries interactive pill/selector chapters
// that need real reading+clicking time, not just a poetic line to glance at. Raising
// this scales every chapter's real scroll-distance uniformly without touching any of
// the 0-1000 axis numbers below, so all existing effect/transition timing (tuned to
// the underlying film content) stays exactly in sync — only the pacing changes.
const SCROLL_VH = 4200

/* -------------------- FRAME SEQUENCE -------------------- */
// Extracted via: ffmpeg -i <source> -vf "fps=12,scale=1920:1080" -c:v libwebp -q:v 80 frame-%04d.webp
const FRAME_COUNT = 854
const FRAME_FIRST = 1 // filenames are 1-indexed (frame-0001.webp .. frame-0854.webp)
const FRAME_URL = (i) => ASSET(`frames/frame-${String(i + FRAME_FIRST).padStart(4, '0')}.webp`)
// A decoded 1920x1080 frame is ~7.9MB in memory, ~2.1x the previous 720p frame
// (~3.7MB). Decode happens off the main thread now (see the worker path below),
// so a wider window/prefetch no longer costs scroll responsiveness the way it
// would have on the old main-thread-decode path — these are tuned as generously
// as the memory budget allows, not capped for CPU-contention reasons.
const FRAME_WINDOW = 28 // frames kept decoded/resident on each side of the current position (main-thread fallback path)
const PREFETCH_BEHIND = 6 // frames prefetched behind the scroll direction per seek
const PREFETCH_AHEAD = 14 // frames prefetched ahead of the scroll direction per seek
const CROP_TOP_BIAS = 0 // keep the full top of the frame; all vertical crop is absorbed by the bottom

/* -------------------- WORKER + OFFSCREENCANVAS PIPELINE --------------------
   Decode/draw happens off the main thread (a dedicated Worker owns an
   OffscreenCanvas) so GSAP/ScrollTrigger's own scroll-handling on the main
   thread never competes with image decode work — see lib/workers/hero-frame-worker.js.
   Falls back to today's main-thread <canvas> path (setupMainThreadPath below)
   when OffscreenCanvas 2D-in-worker isn't supported. -------------------- */

// canvas.transferControlToOffscreen() can only ever be called once per canvas
// element — this registry lets React Strict Mode's dev-only mount/cleanup/mount
// reuse the same worker on the phantom remount instead of re-transferring.
const workerRegistry = new WeakMap() // HTMLCanvasElement -> Worker

function detectOffscreenSupport() {
  if (typeof window === 'undefined') return false
  if (!('OffscreenCanvas' in window)) return false
  if (typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') return false
  try {
    // throwaway probe canvas — catches browsers that expose OffscreenCanvas for
    // WebGL/bitmaprenderer only, not 2d. Never touches the real hero canvas.
    return !!new OffscreenCanvas(1, 1).getContext('2d')
  } catch {
    return false
  }
}

function setupWorkerPath(canvas) {
  let worker = workerRegistry.get(canvas)
  if (!worker) {
    worker = new Worker(new URL('../../lib/workers/hero-frame-worker.js', import.meta.url), { name: 'hero-frame-worker' })
    workerRegistry.set(canvas, worker)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const offscreen = canvas.transferControlToOffscreen()
    worker.postMessage({
      type: 'init',
      canvas: offscreen,
      width: Math.round(canvas.clientWidth * dpr),
      height: Math.round(canvas.clientHeight * dpr),
      frameCount: FRAME_COUNT,
      frameFirst: FRAME_FIRST,
      frameBase: ASSET('frames/frame-'),
      framePad: 4,
      frameExt: '.webp',
      frameWindow: FRAME_WINDOW,
      cropTopBias: CROP_TOP_BIAS,
      prefetchBehind: PREFETCH_BEHIND,
      prefetchAhead: PREFETCH_AHEAD,
    }, [offscreen])
  }

  let lastPosted = -1
  const onFrameTarget = (target) => {
    if (target === lastPosted) return
    lastPosted = target
    worker.postMessage({ type: 'seek', target })
  }
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    worker.postMessage({
      type: 'resize',
      width: Math.round(canvas.clientWidth * dpr),
      height: Math.round(canvas.clientHeight * dpr),
    })
  }
  return { onFrameTarget, resize }
}

function setupMainThreadPath(canvas) {
  const ctx = canvas?.getContext('2d', { alpha: false })

  // windowed cache: only frames near the current position stay decoded in memory
  // (each decoded 1280x720 frame is ~3.7MB regardless of its compressed file
  // size, so holding all 854 at once would be several GB).
  const frameCache = new Map() // frameIndex -> HTMLImageElement (loaded)
  const pending = new Set()
  let lastDrawTarget = 0

  const drawIndex = (target) => {
    if (!ctx || !canvas.width || !canvas.height) return
    let img = frameCache.get(target)
    if (!img) {
      for (let d = 1; d <= FRAME_WINDOW && !img; d++) {
        img = frameCache.get(target - d) || frameCache.get(target + d)
      }
    }
    if (!img) return
    const cw = canvas.width, ch = canvas.height
    const canvasRatio = cw / ch
    const imgRatio = img.naturalWidth / img.naturalHeight
    let sx, sy, sw, sh
    if (imgRatio > canvasRatio) {
      // source proportionally wider than canvas -> crop left/right, centered
      sh = img.naturalHeight
      sw = sh * canvasRatio
      sy = 0
      sx = (img.naturalWidth - sw) / 2
    } else {
      // source proportionally taller-cropped than canvas (wide/short viewports) ->
      // crop top/bottom, but biased toward the top so sky/subject isn't sacrificed
      // to keep excess ground centered.
      sw = img.naturalWidth
      sh = sw / canvasRatio
      sx = 0
      sy = (img.naturalHeight - sh) * CROP_TOP_BIAS
    }
    // drawImage's destination rect (0,0,cw,ch) always covers the full canvas,
    // so there's nothing left uncovered — clearRect before it is wasted work.
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }

  const requestFrame = (i) => {
    if (i < 0 || i >= FRAME_COUNT || frameCache.has(i) || pending.has(i)) return
    pending.add(i)
    const img = new Image()
    img.onload = () => {
      pending.delete(i)
      frameCache.set(i, img)
      if (i === lastDrawTarget) drawIndex(i)
    }
    img.onerror = () => pending.delete(i)
    img.src = FRAME_URL(i)
  }

  const pruneCache = (center) => {
    for (const key of frameCache.keys()) {
      if (Math.abs(key - center) > FRAME_WINDOW * 2) frameCache.delete(key)
    }
  }

  const resize = () => {
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    drawIndex(lastDrawTarget)
  }

  const onFrameTarget = (target) => {
    if (target === lastDrawTarget) return
    lastDrawTarget = target
    for (let d = -PREFETCH_BEHIND; d <= PREFETCH_AHEAD; d++) requestFrame(target + d)
    drawIndex(target)
    pruneCache(target)
  }

  // prime the first frame so something is visible before any scroll happens
  requestFrame(0)

  return { onFrameTarget, resize }
}

/* -------------------- AMBIENT / MICRO-LIFE ACCENTS -------------------- */
/* Small, subtle, decorative motion layers only — never a substitute for the
   real artwork. Counts kept modest for 60fps performance. */

function Dust({ count = 16 }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="absolute rounded-full bg-[#F8F4EC] animate-float-slow"
          style={{
            left: `${(i * 41 + 6) % 100}%`, top: `${(i * 29 + 8) % 100}%`,
            width: 3 + (i % 4), height: 3 + (i % 4), opacity: 0.4,
            animationDelay: `${-i * 0.6}s`, animationDuration: `${8 + (i % 5)}s`,
          }} />
      ))}
    </div>
  )
}

function RainLines({ count = 42 }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="absolute top-0 h-10 w-px bg-[#dce8ee]/70 animate-rain-fall"
          style={{
            left: `${(i * 7.1 + 2) % 100}%`, transform: 'rotate(10deg)',
            animationDuration: `${1.1 + (i % 5) * 0.18}s`, animationDelay: `${-i * 0.22}s`,
          }} />
      ))}
    </div>
  )
}

function LeafDrops({ count = 10, tint = '#8ea681' }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 26" className="absolute top-0 h-4 w-3 animate-leaf-drop"
          style={{ left: `${(i * 53 + 10) % 96}%`, animationDuration: `${7 + (i % 5)}s`, animationDelay: `${-i * 1.3}s` }}>
          <path d="M10 2C4 8 2 16 10 24C18 16 16 8 10 2Z" fill={tint} opacity="0.75" />
        </svg>
      ))}
    </div>
  )
}

function Petals({ count = 12 }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="absolute top-0 h-3 w-3 animate-leaf-drop"
          style={{ left: `${(i * 37 + 8) % 96}%`, animationDuration: `${8 + (i % 6)}s`, animationDelay: `${-i * 1.1}s` }}>
          <ellipse cx="10" cy="7" rx="4.4" ry="6" fill="#f6ede0" opacity="0.9" />
        </svg>
      ))}
    </div>
  )
}

function LightRay({ className = '' }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute -top-[10%] h-[130%] w-[45%] bg-gradient-to-b from-[#fff6df]/50 via-[#fff6df]/10 to-transparent blur-2xl animate-pulse-glow ${className}`}
      style={{ transform: 'rotate(8deg)' }} />
  )
}

function ButterflyMini({ style, tint = '#c48a5a' }) {
  return (
    <svg viewBox="0 0 24 24" className="absolute h-3.5 w-3.5 md:h-4 md:w-4" style={style} aria-hidden>
      <g className="animate-wing-flap">
        <ellipse cx="7" cy="10" rx="6" ry="7" fill={tint} opacity="0.9" />
        <ellipse cx="17" cy="10" rx="6" ry="7" fill={tint} opacity="0.9" />
      </g>
      <rect x="11.3" y="6" width="1.4" height="12" rx="0.7" fill="#3a2b1f" />
    </svg>
  )
}

function BeeMini({ style }) {
  return (
    <svg viewBox="0 0 20 14" className="absolute h-2.5 w-3.5" style={style} aria-hidden>
      <ellipse cx="10" cy="7" rx="7" ry="5" fill="#d9a860" />
      <path d="M6 3v8M10 2.5v9M14 3v8" stroke="#3a2b1f" strokeWidth="1.4" />
    </svg>
  )
}

function LifeAccents({ innerRef }) {
  return (
    <div ref={innerRef} className="pointer-events-none absolute inset-0 overflow-hidden opacity-0">
      <ButterflyMini style={{ top: '58%', left: '30%', animation: 'drift 20s linear infinite', animationDelay: '-2s' }} />
      <ButterflyMini tint="#d9a37a" style={{ top: '66%', left: '10%', animation: 'drift 24s linear infinite', animationDelay: '-9s' }} />
      <ButterflyMini tint="#8ea681" style={{ top: '48%', left: '0%', animation: 'drift 18s linear infinite', animationDelay: '-6s' }} />
      <BeeMini style={{ top: '70%', left: '20%', animation: 'drift 15s linear infinite', animationDelay: '-3s' }} />
      <BeeMini style={{ top: '62%', left: '5%', animation: 'drift 17s linear infinite', animationDelay: '-11s' }} />
    </div>
  )
}

/* -------------------- COLOR / GLASS TOKENS --------------------
   Hero text/glass colors are hardcoded (not the theme's --foreground/--background
   CSS vars) on purpose: they're chosen for contrast against the FILM playing
   underneath, which has nothing to do with whether the visitor's site theme is
   light or dark. Using the theme vars here would make hero legibility depend on
   an unrelated toggle.

   "Real glass" per the reference: a light, even frost (enough blur to keep text
   legible over busy footage) with high transparency and a bright 1px rim that
   reads like light catching an edge — short of the heavy, milky "frosted shower
   door" look of a large blur radius plus a dense tint. */

const INK = '#2b1f14' // dark ink — for text sitting on bright footage
const CREAM = '#f5ecd9' // warm cream — for text sitting on dark footage

const GLASS_LIGHT = 'bg-white/22 backdrop-blur-[11px] border border-white/55 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65),0_8px_30px_-8px_rgba(0,0,0,0.35)]'
// bg-black opacity bumped up from an earlier /34: over saturated green canopy
// footage, backdrop-blur was letting enough of that green through the tint
// that the plate (and the cream text sitting on it) read as dark green instead
// of a neutral charcoal — this opacity is what actually neutralizes the hue.
const GLASS_DARK = 'bg-black/55 backdrop-blur-[11px] border border-white/22 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_8px_30px_-8px_rgba(0,0,0,0.55)]'

function glassTokens(variant) {
  const isLight = variant === 'light'
  return {
    isLight,
    glassCls: isLight ? GLASS_LIGHT : GLASS_DARK,
    text: isLight ? INK : CREAM,
    subCls: isLight ? 'text-[#2b1f14]/65' : 'text-[#f5ecd9]/70',
    hoverCls: isLight ? 'hover:bg-white/22' : 'hover:bg-white/10',
    chipActiveCls: isLight ? 'bg-[#2b1f14] text-[#f5ecd9]' : 'bg-[#f5ecd9] text-[#2b1f14]',
    iconBgCls: isLight ? 'bg-black/5' : 'bg-white/10',
  }
}

/* -------------------- CAPTION -------------------- */
/* Headline text is bold, not italic, and colored with a fixed hex per `tone`
   (see the color tokens above) plus a soft directional drop-shadow — a dark
   halo behind cream text, a light halo behind ink text — so it stays readable
   even where the footage brightness varies within a chapter's scroll window. */

function Caption({ innerRef, tone = 'dark', align = 'left', className = '', extra, scrim = false, children }) {
  const isLight = tone === 'light'
  const toneColor = isLight ? CREAM : INK
  const shadowCls = isLight ? 'drop-shadow-[0_1px_9px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_1px_9px_rgba(255,255,255,0.6)]'
  const alignCls = align === 'center' ? 'left-1/2 -translate-x-1/2 text-center' : align === 'right' ? 'right-6 md:right-16 text-right' : 'left-6 md:left-16'
  // Bold text is wider per character than the regular weight this was first
  // tuned against, so the same ch-based width now wraps to more lines than
  // intended — widened to compensate.
  const widthCls = extra ? 'max-w-[30ch] md:max-w-[46ch]' : 'max-w-[15ch] md:max-w-[17ch]'
  // pointer-events-none by default: neighboring chapters' caption boxes can
  // geometrically overlap (they're not scroll-gated by visibility, only by
  // opacity), so an inactive caption must not be able to steal hover/clicks
  // from an active one sitting nearby. The GSAP timeline flips this element's
  // pointerEvents to 'auto' for exactly its own visible window (see the
  // tl.set(...pointerEvents...) calls alongside each chapter's fadeInOut call)
  // — an inline style, so it cleanly overrides this class while active.
  return (
    <div ref={innerRef} className={`absolute ${alignCls} ${widthCls} opacity-0 pointer-events-none ${className}`} style={{ transform: 'translateY(16px)' }}>
      {scrim ? (
        // Some chapters (Mature tree, Birds) pin over footage that swings from
        // bright sky to dark canopy within the same visible window — no single
        // flat text color stays readable across that range. A small dark plate
        // behind the headline guarantees contrast regardless of what's behind it.
        <p className={`inline-block -mx-4 rounded-2xl px-4 py-2 font-serif font-bold not-italic text-3xl md:text-5xl leading-[1.15] tracking-tight ${GLASS_DARK}`} style={{ color: CREAM }}>{children}</p>
      ) : (
        <p className={`font-serif font-bold not-italic text-3xl md:text-5xl leading-[1.15] tracking-tight ${shadowCls}`} style={{ color: toneColor }}>{children}</p>
      )}
      {extra && <div className="mt-6">{extra}</div>}
    </div>
  )
}

/* -------------------- SUPPORTING TEXT / LINKS -------------------- */
/* A small real-glass pill instead of bare underlined text — reads as a tappable
   control rather than a stray line of copy, and (like the option rows) carries
   its own background so it stays legible independent of the footage behind it. */

function LinkChip({ href, glass = 'light', compact = false, children }) {
  const t = glassTokens(glass)
  if (compact) {
    return (
      <Link href={href} className={`group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${t.glassCls} ${t.hoverCls}`} style={{ color: t.text }}>
        {children} <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    )
  }
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 rounded-full py-1.5 pl-3.5 pr-1.5 text-[11px] font-bold uppercase tracking-wide transition ${t.glassCls} ${t.hoverCls}`}>
      <span style={{ color: t.text }}>{children}</span>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 ${t.iconBgCls}`}>
        <ArrowRight className="h-3 w-3" style={{ color: t.text }} />
      </span>
    </Link>
  )
}

function SupportLine({ text, href, label, tone = 'dark' }) {
  const isLight = tone === 'light'
  const color = isLight ? CREAM : INK
  const shadowCls = isLight ? 'drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]' : 'drop-shadow-[0_1px_10px_rgba(255,255,255,0.55)]'
  return (
    <div>
      <p className={`text-sm md:text-base font-bold leading-snug ${shadowCls}`} style={{ color }}>{text}</p>
      {href && <div className="mt-2.5"><LinkChip href={href} glass={isLight ? 'dark' : 'light'}>{label}</LinkChip></div>}
    </div>
  )
}

/* -------------------- GLASS OPTION LIST --------------------
   Real-glass list rows (icon + bold label + description + chevron), always
   fully visible — no hover-to-reveal needed, so behavior is identical on
   mouse and touch. Each row is a plain Link; tapping/clicking just navigates. */

function OptionList({ items, glass = 'light', centered = false }) {
  const t = glassTokens(glass)
  return (
    <div className={`flex flex-col gap-3 text-left ${centered ? 'mx-auto max-w-xs' : ''}`}>
      {items.map(item => (
        <Link key={item.id} href={item.href} className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${t.glassCls} ${t.hoverCls}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${t.iconBgCls}`}>
            <item.icon className="h-4 w-4" style={{ color: t.text }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-tight" style={{ color: t.text }}>{item.label}</span>
            <span className={`block text-xs mt-0.5 leading-snug ${t.subCls}`}>{item.description}</span>
          </span>
          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${t.subCls}`} />
        </Link>
      ))}
    </div>
  )
}

function ExampleCard({ name, quote, glass = 'light' }) {
  const t = glassTokens(glass)
  return (
    <div className={`rounded-2xl px-4 py-3 ${t.glassCls}`}>
      <p className={`text-[10px] uppercase tracking-widest ${t.subCls}`}>Example</p>
      <p className="mt-1 font-serif italic text-sm leading-snug" style={{ color: t.text }}>&ldquo;{quote}&rdquo;</p>
      <p className={`mt-1 text-xs ${t.subCls}`}>— {name}</p>
    </div>
  )
}

/* -------------------- GLASS SEGMENTED CHOICE --------------------
   A tab-like real-glass control (Individual / Group / Organisation). Click to
   switch on both mouse and touch — no hover dependency. First item is
   preselected so its description/links are visible without any interaction. */

function SegmentedChoice({ items, glass = 'light', align = 'left' }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? null)
  const active = items.find(i => i.id === activeId) || items[0]
  const t = glassTokens(glass)

  return (
    <div className={align === 'right' ? 'flex flex-col items-end' : undefined}>
      <div className={`inline-flex flex-wrap items-center gap-1 rounded-full p-1 ${t.glassCls}`}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs md:text-sm font-bold transition ${activeId === item.id ? t.chipActiveCls : t.hoverCls}`}
            style={activeId === item.id ? undefined : { color: t.text }}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
      {active && (
        <div className={`mt-3 max-w-sm rounded-2xl px-4 py-3 ${t.glassCls}`}>
          <p className="text-sm font-medium leading-relaxed" style={{ color: t.text }}>{active.description}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {active.links.map(l => (
              <LinkChip key={l.href} href={l.href} glass={glass} compact>
                {l.label}
              </LinkChip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------- REAL (OR ILLUSTRATIVE) GROWTH STATUS --------------------
   If this visitor is logged in and has already registered a tree via /plant,
   show its real elapsed-time status (computed from the server timestamp — not
   invented) by bolding the matching step in the trail. Otherwise show the same
   trail clearly labeled as an example instead of pretending a stage belongs
   to them. */

const GROWTH_STEPS = ['Day 1 Planted', 'Day 30 Growing', 'Year 1 Thriving']

function GrowthStatus({ glass = 'dark' }) {
  const [tree, setTree] = useState(undefined) // undefined = not checked yet
  useEffect(() => {
    let cancelled = false
    fetch('/api/member/proxy/trees')
      .then((res) => (res.ok ? res.json() : []))
      .then((all) => {
        if (cancelled) return
        setTree(Array.isArray(all) && all.length ? all[0] : null)
      })
      .catch(() => { if (!cancelled) setTree(null) })
    return () => { cancelled = true }
  }, [])

  if (tree === undefined) return null

  const t = glassTokens(glass)
  let stageIndex = -1
  if (tree) {
    const days = Math.max(1, Math.floor((Date.now() - new Date(tree.createdAt).getTime()) / 86400000) + 1)
    stageIndex = days < 7 ? 0 : days < 365 ? 1 : 2
  }

  return (
    <div className={`mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-2xl px-4 py-3 ${t.glassCls}`}>
      <span className={`mr-1 text-[10px] uppercase tracking-widest ${t.subCls}`}>{tree ? tree.name : 'Example'}</span>
      {GROWTH_STEPS.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span className={i === stageIndex ? 'text-xs font-bold' : `text-xs font-bold ${t.subCls}`} style={i === stageIndex ? { color: t.text } : undefined}>
            {step}
          </span>
          {i < GROWTH_STEPS.length - 1 && <ArrowRight className={`h-3 w-3 ${t.subCls}`} />}
        </span>
      ))}
    </div>
  )
}

/* -------------------- CHAPTER DATA -------------------- */

const SPROUT_ITEMS = [
  { id: 'plant', label: 'Plant by myself', description: 'Find a sapling and planting opportunity, then register and track your tree.', href: '/plant', icon: Sprout },
  { id: 'adopt', label: 'Adopt a nearby tree', description: 'Choose an existing tree near you and become responsible for its care.', href: '/adopt', icon: MapPin },
  { id: 'drive', label: 'Join an NGO drive', description: 'Discover verified plantation drives, reserve your place and plant with others.', href: '/drives', icon: Users },
  { id: 'donate', label: 'Donate to an NGO', description: 'Support a verified project while the NGO handles planting and maintenance.', href: '/donate', icon: Heart },
]

const SAPLING_ITEMS = [
  { id: 'name', label: 'Name your tree', description: 'Give your tree a name it will carry for the rest of its life.', href: '/plant', icon: Tag },
  { id: 'legacy', label: 'Write its legacy', description: 'Leave a message future visitors can read beneath its shade.', href: '/plant', icon: ScrollText },
  { id: 'track', label: 'Track its growth', description: 'Follow its story through every season, right from your device.', href: '/plant', icon: TrendingUp },
]

const MATURE_ITEMS = [
  { id: 'individual', label: 'Individual', icon: User, description: 'Build your personal grove, maintain care streaks and collect the story of every tree.', links: [{ label: 'Trees', href: '/trees' }, { label: 'Dashboard', href: '/dashboard/individual' }] },
  { id: 'group', label: 'Group', icon: Users, description: 'Plant with family, friends or communities. Grow a shared forest and complete challenges together.', links: [{ label: 'Start a group', href: '/group/register' }, { label: 'Leaderboards', href: '/leaderboards' }] },
  { id: 'organisation', label: 'Organisation', icon: Building2, description: 'Run large campaigns, involve employees or students and receive verified impact reports.', links: [{ label: 'Partners', href: '/partners' }, { label: 'Dashboard', href: '/dashboard/corporate' }] },
]

const IMPACT_ITEMS = [
  { id: 'shelter', label: 'Creates shelter', icon: TreePine },
  { id: 'biodiversity', label: 'Supports biodiversity', icon: Bird },
  { id: 'forest', label: 'Becomes part of a larger forest', icon: Leaf },
]

/* -------------------- MAIN APP -------------------- */

export default function HomeClient({ namingExample }) {
  const wrapRef = useRef(null)
  const stageRef = useRef(null)

  // background — scroll-scrubbed frame sequence drawn to canvas (replaces <video> scrubbing)
  const canvasRef = useRef(null)

  // mood/particles
  const moodRef = useRef(null)
  const dustRef = useRef(null)
  const rainOverlayRef = useRef(null)
  const leafOverlayRef = useRef(null)
  const petalRef = useRef(null)
  const lightRayRef = useRef(null)
  const accentsRef = useRef(null)

  // text
  const titleRef = useRef(null)
  const scrollCueRef = useRef(null)
  const cap2Ref = useRef(null)
  const cap3Ref = useRef(null)
  const cap4Ref = useRef(null)
  const cap5Ref = useRef(null)
  const cap6Ref = useRef(null)
  const cap7Ref = useRef(null)
  const ctaWrapRef = useRef(null)
  const progressFillRef = useRef(null)

  const [showChooser, setShowChooser] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const path = detectOffscreenSupport() ? setupWorkerPath(canvas) : setupMainThreadPath(canvas)
    path.resize()
    window.addEventListener('resize', path.resize)

    const ctx2 = gsap.context(() => {
      const g = (r) => r.current

      // ---- initial states ----
      gsap.set(g(moodRef), { opacity: 0 })
      gsap.set([g(rainOverlayRef), g(leafOverlayRef), g(petalRef), g(accentsRef), g(lightRayRef)], { opacity: 0 })
      gsap.set(g(dustRef), { opacity: 1 })
      gsap.set(g(titleRef), { opacity: 0, y: 16 })
      gsap.set(g(ctaWrapRef), { opacity: 0, y: 24 })

      // ---- helpers ----
      // `interactive` is for caption boxes carrying clickable/hoverable `extra`
      // content (pills, links): pointerEvents is flipped to 'auto' for exactly
      // this element's visible window and back to 'none' after, as an inline
      // style (overrides the pointer-events-none default class while active).
      // Needed because caption boxes aren't full-viewport but can still
      // geometrically overlap a neighboring chapter's box — without this, an
      // invisible-but-still-in-the-DOM caption could intercept hover/clicks
      // meant for a different, currently-visible one nearby.
      const fadeInOut = (tl, el, inS, inE, outS, outE, interactive = false) => {
        tl.to(el, { opacity: 1, y: 0, duration: inE - inS, ease: 'power2.out' }, inS)
        tl.to(el, { opacity: 0, y: -16, duration: outE - outS, ease: 'power2.in' }, outS)
        if (interactive) {
          tl.set(el, { pointerEvents: 'auto' }, inS)
          tl.set(el, { pointerEvents: 'none' }, outE)
        }
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          // scrub delay was the real source of the "lag" complaint across every prior
          // rendering approach (video, then canvas) — a low value keeps a touch of
          // smoothing without the frame visibly trailing the scroll position.
          scrub: 0.35,
          pin: stageRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })

      /* ---- frame playback scrubbed by scroll: plays forward on scroll down, ----
         ---- backward on scroll up, spanning the entire 0–1000 timeline. ---- */
      const frameState = { i: 0 }
      tl.to(frameState, {
        i: FRAME_COUNT - 1, duration: 1000, ease: 'none',
        onUpdate() {
          const target = Math.min(Math.max(Math.round(frameState.i), 0), FRAME_COUNT - 1)
          path.onFrameTarget(target)
        },
      }, 0)

      /* ===================== CHAPTER 1 — THE SEED (0–110) ===================== */
      fadeInOut(tl, g(titleRef), 5, 40, 55, 78)
      tl.to(g(scrollCueRef), { opacity: 0, duration: 15 }, 40)
      tl.to(g(dustRef), { opacity: 0, duration: 20 }, 90)

      /* ===================== CHAPTER 2 — BELOW THE EARTH (150–230) ===================== */
      fadeInOut(tl, g(cap2Ref), 165, 190, 208, 228, true)

      /* ===================== CHAPTER 3 — FIRST LIFE (300–380) ===================== */
      tl.to(g(lightRayRef), { opacity: 1, duration: 40 }, 300)
      fadeInOut(tl, g(cap3Ref), 312, 338, 352, 372, true)
      tl.to(g(lightRayRef), { opacity: 0, duration: 30 }, 385)

      /* ===================== CHAPTER 4 — GROWTH / STORM ROLLS IN (380–500) ===================== */
      tl.to(g(moodRef), { opacity: 1, backgroundColor: 'rgba(58,70,80,0.28)', duration: 45 }, 380)
      tl.to(g(rainOverlayRef), { opacity: 1, duration: 45 }, 395)
      tl.to(g(leafOverlayRef), { opacity: 1, duration: 40 }, 410)
      fadeInOut(tl, g(cap4Ref), 442, 466, 480, 498, true)

      /* transition D: a leap through time — the sapling becomes the tree */
      tl.to([g(rainOverlayRef), g(leafOverlayRef)], { opacity: 0, duration: 35 }, 500)
      tl.to(g(moodRef), { opacity: 0, duration: 45 }, 505)
      tl.to(g(lightRayRef), { opacity: 0.55, duration: 35 }, 545)

      /* ===================== CHAPTER 5 — THE ECOSYSTEM (560–630) ===================== */
      tl.to(g(accentsRef), { opacity: 1, duration: 40 }, 560)
      fadeInOut(tl, g(cap5Ref), 572, 598, 612, 630, true)

      /* transition E: the same tree blossoms — a gentle bloom, not a cut */
      tl.to(g(petalRef), { opacity: 1, duration: 35 }, 636)

      /* ===================== CHAPTER 6 — THE COMMUNITY BLOOMS (670–745) ===================== */
      fadeInOut(tl, g(cap6Ref), 682, 708, 722, 742, true)

      /* transition F: the camera pushes into the canopy, toward the nest */
      tl.to(g(petalRef), { opacity: 0, duration: 30 }, 750)

      /* ===================== CHAPTER 7 — LIFE RETURNS (800–865) ===================== */
      fadeInOut(tl, g(cap7Ref), 812, 838, 850, 868, true)

      /* transition G: the camera pulls back and rises above the canopy */
      tl.to(g(accentsRef), { opacity: 0, duration: 35 }, 870)
      tl.to(g(lightRayRef), { opacity: 0.7, duration: 55 }, 900)

      /* ===================== CHAPTER 8 — THE FOREST (928–1000) ===================== */
      tl.to(g(ctaWrapRef), { opacity: 1, y: 0, duration: 40, ease: 'power2.out' }, 950)

      // side progress indicator
      tl.eventCallback('onUpdate', () => {
        const st = tl.scrollTrigger
        if (st && progressFillRef.current) {
          progressFillRef.current.style.transform = `scaleY(${st.progress})`
        }
      })
    }, wrapRef)

    // Fonts are loaded via a Google Fonts @import with font-display:swap (see
    // globals.css), so Fraunces/Inter can finish downloading and swap in well
    // after `load` fires — on a cold cache that reflows the Navbar/headline
    // text, shifting where wrapRef actually sits in the document. If that
    // shift happens after ScrollTrigger already cached its pin start/end, the
    // pin-spacer is left the wrong size and the pinned stage overlaps the
    // footer until something (e.g. a manual refresh) recomputes it. A warm
    // cache never swaps, which is why a page refresh "fixes" it. Refreshing
    // once document.fonts.ready resolves closes that race deterministically.
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh()
      })
    }
    const t = setTimeout(() => ScrollTrigger.refresh(), 600)

    return () => {
      cancelled = true
      ctx2.revert()
      window.removeEventListener('load', onLoad)
      window.removeEventListener('resize', path.resize)
      clearTimeout(t)

      // Worker termination is deferred: transferControlToOffscreen() can only
      // happen once per canvas, so React Strict Mode's dev-only synchronous
      // mount->cleanup->mount must not tear the worker down on the phantom
      // remount — only on a real unmount (canvas actually leaves the DOM).
      const worker = workerRegistry.get(canvas)
      if (worker) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!document.body.contains(canvas)) {
            worker.terminate()
            workerRegistry.delete(canvas)
          }
        }))
      }
    }
  }, [])

  return (
    <div className="bg-[#F8F4EC]">
      <div ref={wrapRef} id="cinematic-hero" data-navbar-hero className="relative" style={{ height: `${SCROLL_VH}vh` }}>
        <div ref={stageRef} className="relative h-screen w-full overflow-hidden">

          {/* single cinematic background — scroll-scrubbed frame sequence drawn to canvas.
              Full-bleed, including behind the navbar (see Navbar.jsx for the legibility
              treatment that keeps nav text readable against any frame). */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* mood / color-grade overlay */}
          <div ref={moodRef} className="pointer-events-none absolute inset-0" />

          {/* ambient micro-life */}
          <div ref={dustRef} className="pointer-events-none absolute inset-0"><Dust /></div>
          <div ref={rainOverlayRef} className="pointer-events-none absolute inset-0"><RainLines /></div>
          <div ref={leafOverlayRef} className="pointer-events-none absolute inset-0"><LeafDrops tint="#8ea681" /></div>
          <div ref={petalRef} className="pointer-events-none absolute inset-0"><Petals /></div>
          <div ref={lightRayRef} className="pointer-events-none absolute inset-0 overflow-hidden">
            <LightRay className="right-[8%]" />
          </div>
          <LifeAccents innerRef={accentsRef} />

          {/* ---------------- TEXT ---------------- */}
          {/* pointer-events-none: same full-viewport-even-while-invisible issue as
              ctaWrapRef below, and this z-20 box would otherwise sit above every
              z-auto caption for the rest of the scroll. No interactive content here
              (chapter 1 is intentionally link-free), so nothing needs to opt back in. */}
          <div ref={titleRef} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
            <p className="eyebrow mb-5 text-foreground/60">ARTH</p>
            <h1 className="font-serif font-light text-[9vw] md:text-[5.2vw] leading-[0.98] tracking-tight text-balance max-w-[16ch] text-foreground">
              Leave More<br />Than <em className="not-italic text-primary">Footprints</em>.
            </h1>
            <p className="mt-6 text-sm md:text-base text-foreground/70 max-w-xs md:max-w-sm text-balance">Plant, care for and grow something that outlives you.</p>
          </div>

          <div ref={scrollCueRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-foreground/50">
            <span>Scroll</span>
            <span className="h-8 w-px bg-foreground/40 animate-pulse-glow" />
          </div>

          <Caption innerRef={cap2Ref} tone="light" align="left" className="top-[26%]"
            extra={<SupportLine tone="light" text="A tree is not an event. It is a responsibility." href="/how-it-works" label="See how ARTH works" />}>
            It starts where no one sees.
          </Caption>

          {/* Real footage here is dark soil/roots (confirmed by screenshot), same as
              chapters 4 and 5 below — tone="light" + dark glass, not the reference
              mockup's brighter assumption. Nudged down + right (top 9%→22%, left
              50%→57%) so it sits over the soil itself instead of straddling the
              lighter sky/soil boundary at the very top of the frame. */}
          <Caption innerRef={cap3Ref} tone="light" align="center" className="top-[22%] left-[57%] -translate-x-1/2 text-center"
            extra={<OptionList items={SPROUT_ITEMS} glass="dark" centered />}>
            Choose how you begin.
          </Caption>

          {/* Chapter 4 sits over genuinely dark root/underground footage in the real
              film (confirmed by screenshot, unlike a brighter assumption), so this
              uses tone="light" (cream headline) + dark glass, not tone="dark". */}
          <Caption innerRef={cap4Ref} tone="light" align="left" className="top-[13%]"
            extra={
              <div className="space-y-3">
                <SupportLine tone="light" text="Name it. Leave a message. Follow its story through every season." />
                <OptionList items={SAPLING_ITEMS} glass="dark" />
                <ExampleCard glass="dark" name={namingExample.name} quote={namingExample.quote} />
                <LinkChip href="/trees" glass="dark">Discover tree ownership</LinkChip>
              </div>
            }>
            Make one tree yours.
          </Caption>

          {/* Chapter 5 (rain) is also genuinely dark/stormy at the point the caption
              sits — same reasoning as chapter 4. */}
          <Caption innerRef={cap5Ref} tone="light" align="left" className="top-[26%]"
            extra={
              <div className="space-y-3">
                <SupportLine tone="light" text="Planting takes a day. Keeping it alive takes commitment." />
                <GrowthStatus glass="dark" />
                <LinkChip href="/how-it-works" glass="dark">See how trees are cared for</LinkChip>
              </div>
            }>
            One seed becomes shelter.
          </Caption>

          {/* Real footage here pans from bright sky to a large dark tree canopy
              within this chapter's visible scroll window (confirmed by screenshot —
              ink text on it read fine early, then nearly vanished later), so the
              headline uses `scrim` for guaranteed contrast. Moved to the bottom
              left (was top-left) — bottom-right sits under the heaviest depth-of-
              field blur in this shot, so bottom-left instead: clear of the trunk
              and off the blurriest part of the frame. */}
          <Caption innerRef={cap6Ref} tone="light" align="left" className="bottom-[8%] md:bottom-[12%]" scrim
            extra={<SegmentedChoice items={MATURE_ITEMS} glass="dark" />}>
            The community blooms around it.
          </Caption>

          {/* Same reasoning as chapter 6: the Birds footage is dark/warm canopy
              throughout this window, and the previous ink-on-light-glass combo
              (confirmed by screenshot) was nearly invisible. Headline uses `scrim`,
              support line + impact card + links all switch to the light-on-dark
              treatment already proven out in chapters 3–5. */}
          <Caption innerRef={cap7Ref} tone="light" align="left" className="top-[22%]" scrim
            extra={
              <div className="space-y-3">
                <SupportLine tone="light" text="Every surviving tree can become shade, habitat, memory and legacy." />
                <div className={`rounded-2xl px-4 py-3 space-y-2 ${GLASS_DARK}`}>
                  {IMPACT_ITEMS.map(item => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 shrink-0" style={{ color: CREAM }} />
                      <span className="text-xs font-bold" style={{ color: CREAM }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkChip href="/forests" glass="dark">Explore growing forests</LinkChip>
                  <LinkChip href="/blogs" glass="dark">Read stories from the ground</LinkChip>
                </div>
              </div>
            }>
            Life returns. Life stays.
          </Caption>

          {/* final CTA */}
          {/* pointer-events-none on the wrapper: this box spans the full viewport even
              while invisible (opacity is animated, not display), which would otherwise
              block hover/click on every earlier chapter's interactive pills underneath
              it in DOM order. Its own interactive children opt back in individually.
              This whole block previously used theme tokens (text-foreground, bg-foreground,
              text-primary) instead of the fixed ink/cream palette every other chapter
              uses — those flip with light/dark site theme, independent of what the video
              frame actually looks like, which is what made this section unreadable. */}
          <div ref={ctaWrapRef} className="absolute inset-0 z-20 flex flex-col items-start justify-end pb-16 md:pb-24 pl-6 md:pl-16 pr-6 pointer-events-none">
            <p className={`inline-block -mx-3 mb-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] ${GLASS_DARK}`} style={{ color: CREAM }}>The Forest</p>
            <h2 className={`inline-block -mx-4 rounded-2xl px-4 py-2 font-serif font-bold not-italic text-[9vw] md:text-[4.6vw] leading-[1.08] max-w-[16ch] text-balance ${GLASS_DARK}`} style={{ color: CREAM }}>
              Plant the <em className="not-italic" style={{ color: '#c3dabb' }}>Next Seed</em>.
            </h2>

            <div className="pointer-events-auto">
              <button onClick={() => setShowChooser(v => !v)} className="group mt-8 inline-flex items-center gap-2 rounded-full pl-6 pr-2 py-2 text-sm font-bold" style={{ backgroundColor: INK, color: CREAM }}>
                Start planting
                <span className="grid h-8 w-8 place-items-center rounded-full transition-transform group-hover:translate-x-0.5" style={{ backgroundColor: '#A8C3A0', color: INK }}>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>

              {showChooser && (
                <div className="mt-4 max-w-sm">
                  <p className={`inline-block -mx-2 mb-2 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${GLASS_DARK}`} style={{ color: CREAM }}>How would you like to begin?</p>
                  <OptionList items={SPROUT_ITEMS} glass="dark" />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <LinkChip href="/group/register" glass="dark">Start as a group</LinkChip>
                <LinkChip href="/partners" glass="dark">Partner as an organisation</LinkChip>
              </div>
            </div>

            <div className={`mt-8 hidden md:flex items-center gap-x-10 rounded-2xl px-6 py-4 ${GLASS_DARK}`}>
              <div><div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: `${CREAM}99` }}>Trees planted</div><div className="font-serif font-bold text-2xl mt-1" style={{ color: CREAM }}>1,284,730</div></div>
              <span className="h-8 w-px bg-white/20" />
              <div><div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: `${CREAM}99` }}>CO₂ absorbed</div><div className="font-serif font-bold text-2xl mt-1" style={{ color: CREAM }}>312,406 kg</div></div>
            </div>
          </div>

          {/* scroll progress rail */}
          <div className="pointer-events-none fixed right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 h-40 w-[2px] bg-foreground/10 hidden md:block">
            <div ref={progressFillRef} className="h-full w-full bg-primary origin-top" style={{ transform: 'scaleY(0)' }} />
          </div>

        </div>
      </div>
    </div>
  )
}

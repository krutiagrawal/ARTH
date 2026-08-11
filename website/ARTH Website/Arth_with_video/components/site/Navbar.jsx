'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/site/AuthProvider'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/mission', label: 'Mission' },
  { href: '/explore', label: 'Explore' },
  { href: '/forests', label: 'Forests' },
  { href: '/competitions', label: 'Competitions' },
  { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/blogs', label: 'Journal' },
  { href: '/partners', label: 'Partners' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    // Homepage has a very tall pinned cinematic hero (#cinematic-hero) — keep the
    // navbar transparent for its entire length so it never blurs/covers the video,
    // only switching to the solid/blurred style once that section has fully scrolled by.
    const hero = pathname === '/' ? document.getElementById('cinematic-hero') : null
    if (hero) {
      const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 })
      io.observe(hero)
      return () => io.disconnect()
    }
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll(); window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  return (
    <header
      className={cn('fixed top-0 left-0 right-0 z-50 transition-colors duration-500', scrolled ? 'bg-background/85 backdrop-blur-md border-b border-border/60' : 'bg-transparent')}
      style={scrolled ? undefined : { textShadow: '0 1px 4px rgba(255,255,255,0.95), 0 2px 16px rgba(255,255,255,0.75), 0 0 2px rgba(255,255,255,0.95)' }}
    >
      {/* Permanent light scrim behind the nav while it's transparent-over-video: guarantees
          the dark ink nav text stays legible no matter how bright/dark the frame underneath
          is, without needing the "scrolled" solid bar look while still inside the hero. */}
      {!scrolled && (
        <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 -z-10 h-28 bg-gradient-to-b from-background/85 via-background/45 to-transparent" />
      )}
      <div className="px-5 md:px-10">
        <div className="flex h-16 md:h-20 items-center gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary group-hover:animate-leaf-sway" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2 C 6 6, 4 12, 12 22 C 20 12, 18 6, 12 2 Z" />
              <path d="M12 2 L12 22" />
            </svg>
            <span className="font-serif text-lg tracking-tight">ARTH</span>
          </Link>

          <nav aria-label="Primary" className="mx-auto hidden lg:flex items-center gap-1 text-[13px]">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className={cn(
                'relative px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap',
                pathname === l.href && 'text-foreground'
              )}>
                {pathname === l.href && (
                  <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href={`/dashboard/${user.accountType}`} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-[13px] hover:opacity-90 transition">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Dashboard
                </Link>
                <button onClick={logout} className="rounded-full px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition">
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-[13px] hover:opacity-90 transition">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Start Planting
              </Link>
            )}
            <button onClick={() => setOpen(v => !v)} aria-label="Menu" className="lg:hidden h-9 w-9 rounded-full grid place-items-center hover:bg-secondary">
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="lg:hidden overflow-hidden">
              <ul className="grid grid-cols-2 gap-1 pt-2 pb-4 text-sm">
                {LINKS.map(l => (
                  <li key={l.href}><Link onClick={() => setOpen(false)} href={l.href} className={cn('block rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground', pathname === l.href && 'bg-secondary text-foreground')}>{l.label}</Link></li>
                ))}
                {user ? (
                  <>
                    <li className="col-span-2 pt-1"><Link onClick={() => setOpen(false)} href={`/dashboard/${user.accountType}`} className="block rounded-full bg-foreground text-background text-center py-2.5 text-sm">Dashboard</Link></li>
                    <li className="col-span-2"><button onClick={() => { setOpen(false); logout() }} className="w-full rounded-full border border-border text-center py-2.5 text-sm">Logout</button></li>
                  </>
                ) : (
                  <li className="col-span-2 pt-1"><Link onClick={() => setOpen(false)} href="/login" className="block rounded-full bg-foreground text-background text-center py-2.5 text-sm">Start Planting</Link></li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

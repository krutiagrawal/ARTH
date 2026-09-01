'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Moon, Sun, ChevronDown, Bell } from 'lucide-react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/site/AuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/mission', label: 'Mission' },
  { href: '/explore', label: 'Explore' },
  { href: '/forests', label: 'Forests' },
  // TODO(post-launch): bring back once app/(marketing)/competitions and
  // /leaderboards are re-enabled (see the TODO note in each page.js).
  // { href: '/competitions', label: 'Competitions' },
  // { href: '/leaderboards', label: 'Leaderboards' },
  { href: '/blogs', label: 'Journal' },
  { href: '/partners', label: 'Partners' },
  { href: '/contact', label: 'Contact' },
]

const ACTION_LINKS = [
  { href: '/plant', label: 'Plant a tree' },
  { href: '/adopt', label: 'Adopt a tree' },
  { href: '/donate', label: 'Donate' },
  { href: '/drives', label: 'Join a drive' },
  { href: '/how-it-works', label: 'How it works' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    fetch('/api/member/proxy/notifications/unread-count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUnreadCount(data?.count ?? 0))
      .catch(() => {})
  }, [user])
  const [hasPhotoHero, setHasPhotoHero] = useState(false)
  useEffect(() => {
    // Pages with a full-bleed photo directly under the navbar mark their hero
    // section with [data-navbar-hero] — those get transparent-nav-with-white-text;
    // everywhere else the nav just uses normal dark text over the page's own
    // light background.
    const hero = document.querySelector('[data-navbar-hero]')
    setHasPhotoHero(!!hero)
    if (hero) {
      const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 })
      io.observe(hero)
      return () => io.disconnect()
    }
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll(); window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  const transparent = !scrolled
  const lightText = transparent && hasPhotoHero

  return (
    <header
      className={cn('fixed top-0 left-0 right-0 z-50 transition-colors duration-500', scrolled ? 'bg-background/85 backdrop-blur-md border-b border-border/60' : 'bg-transparent')}
      style={lightText ? { textShadow: '0 1px 3px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.3)' } : undefined}
    >
      <div className="container">
        <div className="relative flex h-16 md:h-20 items-center justify-between gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <svg viewBox="0 0 24 24" className={cn('h-5 w-5 group-hover:animate-leaf-sway', lightText ? 'text-white' : 'text-primary')} fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2 C 6 6, 4 12, 12 22 C 20 12, 18 6, 12 2 Z" />
              <path d="M12 2 L12 22" />
            </svg>
            <span className={cn('font-serif text-lg tracking-tight', lightText && 'text-white')}>ARTH</span>
          </Link>

          <nav aria-label="Primary" className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex items-center gap-1 text-[13px]">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className={cn(
                'relative px-3 py-1.5 transition-colors whitespace-nowrap',
                lightText ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground',
                pathname === l.href && (lightText ? 'text-white' : 'text-foreground')
              )}>
                {pathname === l.href && (
                  <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                {l.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(
                'inline-flex items-center gap-0.5 px-3 py-1.5 transition-colors whitespace-nowrap outline-none',
                lightText ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'
              )}>
                Take action
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ACTION_LINKS.map(l => (
                  <DropdownMenuItem key={l.href} asChild>
                    <Link href={l.href}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-1">
            {mounted && (
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" className={cn(
                'hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full transition',
                lightText ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/dashboard/individual/notifications"
                  aria-label="Notifications"
                  className={cn(
                    'relative hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full transition',
                    lightText ? 'text-white/90 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
                <Link href={'/dashboard/individual'} className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-[13px] hover:opacity-90 transition">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Dashboard
                </Link>
                <button onClick={logout} className={cn(
                  'rounded-full px-3 py-2 text-[13px] transition',
                  lightText ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className={cn(
                  'rounded-full px-3 py-2 text-[13px] transition',
                  lightText ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}>
                  Log in
                </Link>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-[13px] hover:opacity-90 transition">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Get started
                </Link>
              </div>
            )}
            <button onClick={() => setOpen(v => !v)} aria-label="Menu" className={cn(
              'lg:hidden h-9 w-9 rounded-full grid place-items-center',
              lightText ? 'text-white hover:bg-white/10' : 'hover:bg-secondary'
            )}>
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
                <li className="col-span-2 pt-2 pb-1 px-3"><span className="eyebrow">Take action</span></li>
                {ACTION_LINKS.map(l => (
                  <li key={l.href}><Link onClick={() => setOpen(false)} href={l.href} className={cn('block rounded-xl px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground', pathname === l.href && 'bg-secondary text-foreground')}>{l.label}</Link></li>
                ))}
                {user ? (
                  <>
                    <li className="col-span-2 pt-1"><Link onClick={() => setOpen(false)} href={'/dashboard/individual'} className="block rounded-full bg-foreground text-background text-center py-2.5 text-sm">Dashboard</Link></li>
                    <li className="col-span-2"><button onClick={() => { setOpen(false); logout() }} className="w-full rounded-full border border-border text-center py-2.5 text-sm">Logout</button></li>
                  </>
                ) : (
                  <>
                    <li className="col-span-2 pt-1"><Link onClick={() => setOpen(false)} href="/register" className="block rounded-full bg-foreground text-background text-center py-2.5 text-sm">Get started</Link></li>
                    <li className="col-span-2"><Link onClick={() => setOpen(false)} href="/login" className="block rounded-full border border-border text-center py-2.5 text-sm">Log in</Link></li>
                  </>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

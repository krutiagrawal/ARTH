'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutGrid,
  TreePine,
  Sprout,
  CalendarDays,
  HeartHandshake,
  Package,
  Store,
  Users,
  Newspaper,
  Trophy,
  Award,
  Compass,
  Settings,
  Menu,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard/individual', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/dashboard/individual/explore', label: 'Explore', icon: Compass },
  { href: '/dashboard/individual/trees', label: 'My Trees', icon: TreePine },
  { href: '/dashboard/individual/adoptions', label: 'Adopt', icon: Sprout },
  { href: '/dashboard/individual/drives', label: 'Drives', icon: CalendarDays },
  { href: '/dashboard/individual/donations', label: 'Donations', icon: HeartHandshake },
  { href: '/dashboard/individual/orders', label: 'Orders', icon: Package },
  { href: '/dashboard/individual/nurseries', label: 'Nurseries', icon: Store },
  { href: '/dashboard/individual/groups', label: 'Groups', icon: Users },
  { href: '/dashboard/individual/community', label: 'Community', icon: Newspaper },
  { href: '/dashboard/individual/competitions', label: 'Competitions', icon: Trophy },
  { href: '/dashboard/individual/achievements', label: 'Achievements', icon: Award },
]

const SETTINGS_ITEM = { href: '/dashboard/individual/settings', label: 'Settings', icon: Settings }

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname?.startsWith(`${item.href}/`)
}

function NavRow({ item, pathname, onNavigate }) {
  const active = isActive(pathname, item)
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
        active
          ? 'bg-white/20 text-white font-medium'
          : 'text-white/75 hover:bg-white/10 hover:text-white'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

// Sage-green surface, deliberately distinct from the marketing site's cream
// palette and from the NGO/Group dashboards' sand-colored sidebar — this is
// its own hardcoded brand accent (like the Impact panel's forest-deep), not
// wired to the shared --sidebar-* tokens, so it doesn't shift with light/dark
// mode or affect any other dashboard.
const SAGE_BG = 'bg-[hsl(106,25%,38%)]'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  const currentLabel = [...NAV, SETTINGS_ITEM].find((i) => isActive(pathname, i))?.label || 'Dashboard'

  return (
    <>
      {/* Desktop: sage column filling the fixed-height app shell — never scrolls with the page */}
      <aside
        className={cn(
          SAGE_BG,
          'hidden md:flex h-full w-60 shrink-0 flex-col overflow-y-auto px-3 py-6'
        )}
      >
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="mt-4 border-t border-white/15 pt-3">
          <NavRow item={SETTINGS_ITEM} pathname={pathname} />
        </div>
      </aside>

      {/* Mobile: trigger bar (own row above the scrollable content) + slide-in drawer */}
      <div className="md:hidden w-full shrink-0 flex items-center gap-3 border-b border-border/70 bg-background/95 backdrop-blur px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open dashboard menu"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="eyebrow text-primary">{currentLabel}</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className={cn(SAGE_BG, 'w-72 border-none p-0 text-white [&_button]:text-white')}>
          <SheetHeader className="px-4 pt-5">
            <SheetTitle className="text-white font-serif text-lg">Dashboard</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-3 pb-6 pt-2">
            {NAV.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
            ))}
            <div className="mt-3 border-t border-white/15 pt-3">
              <NavRow item={SETTINGS_ITEM} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}

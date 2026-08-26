'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Leaf, CalendarDays, TreePine, LogOut, WifiOff, Newspaper, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MemberProvider, useMember } from '../MemberContext'

const NAV = [
  { label: 'Drives', href: '/app/drives', icon: CalendarDays },
  { label: 'Adopt a tree', href: '/app/trees', icon: TreePine },
  { label: 'Groups', href: '/app/groups', icon: Users },
  { label: 'Following', href: '/app/following', icon: Newspaper },
]

function MemberShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, error, refresh } = useMember()

  const logout = async () => {
    await fetch('/api/member/logout', { method: 'POST' })
    router.push('/app/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-serif text-lg shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-primary">
              <Leaf className="h-4 w-4" />
            </span>
            ARTH
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                  pathname?.startsWith(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[140px]">{loading ? '' : user?.name}</span>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="flex sm:hidden items-center gap-1 border-t border-border/70 px-4 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                pathname?.startsWith(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {error && !user ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <WifiOff className="h-5 w-5" />
          </span>
          <p className="font-serif text-xl">Can&rsquo;t reach the server.</p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button onClick={refresh} className="mt-2 rounded-full">
            Try again
          </Button>
        </div>
      ) : (
        <main className="container py-8">{children}</main>
      )}
    </div>
  )
}

export default function MemberAreaLayout({ children }) {
  return (
    <MemberProvider>
      <MemberShell>{children}</MemberShell>
    </MemberProvider>
  )
}

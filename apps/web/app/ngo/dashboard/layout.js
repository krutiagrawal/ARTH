'use client'

import { useRouter } from 'next/navigation'
import { Home, CalendarDays, TreePine, HeartHandshake, Settings as SettingsIcon, LogOut, Leaf, ChevronDown, BarChart3, HandCoins, Users, WifiOff, Sprout, Newspaper } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import SidebarScenery from '@/components/dashboard/SidebarScenery'
import { Button } from '@/components/ui/button'
import AccountBlockedScreen from '@/components/dashboard/AccountBlockedScreen'
import { NgoProfileProvider, useNgoProfile } from './NgoProfileContext'

const SECTIONS = [
  {
    items: [
      { label: 'Overview', href: '/ngo/dashboard', icon: Home, exact: true },
      { label: 'Drives', href: '/ngo/dashboard/drives', icon: CalendarDays },
      { label: 'Adoptable Trees', href: '/ngo/dashboard/trees', icon: TreePine },
      { label: 'Campaigns', href: '/ngo/dashboard/campaigns', icon: HeartHandshake },
      { label: 'Updates', href: '/ngo/dashboard/updates', icon: Newspaper },
      { label: 'Survival & Impact', href: '/ngo/dashboard/survival', icon: Sprout },
      { label: 'Reports', href: '/ngo/dashboard/reports', icon: BarChart3 },
      { label: 'Donations', href: '/ngo/dashboard/donations', icon: HandCoins },
      { label: 'Volunteers', href: '/ngo/dashboard/volunteers', icon: Users },
      { label: 'Staff', href: '/ngo/dashboard/staff', icon: Users },
      { label: 'Settings', href: '/ngo/dashboard/settings', icon: SettingsIcon },
    ],
  },
]

function NgoShell({ children }) {
  const router = useRouter()
  const { profile, loading, error, blocked, blockReason, refresh } = useNgoProfile()

  const logout = async () => {
    await fetch('/api/ngo/logout', { method: 'POST' })
    router.push('/ngo/login')
  }

  const orgName = loading ? 'Loading…' : profile?.orgName || 'Your organization'
  const initial = (profile?.orgName || 'N').charAt(0).toUpperCase()

  if (blocked) return <AccountBlockedScreen reason={blockReason} onSignOut={logout} />

  return (
    <AppSidebar
      sections={SECTIONS}
      mobileTitle="NGO Dashboard"
      scenery={<SidebarScenery />}
      header={
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Leaf className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">NGO Dashboard</p>
            <p className="text-sm font-medium truncate">{orgName}</p>
          </div>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent transition-colors"
            onClick={() => router.push('/ngo/dashboard/settings')}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{orgName}</span>
              <span className="block text-xs text-sidebar-foreground/60">Admin</span>
            </span>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />
          </button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </>
      }
    >
      {error && !profile ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <WifiOff className="h-5 w-5" />
          </span>
          <p className="font-serif text-xl">Can&rsquo;t reach the server.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {error} Your session is fine – this isn&rsquo;t a login problem, the API just isn&rsquo;t responding right now.
          </p>
          <Button onClick={refresh} className="mt-2 rounded-full">
            Try again
          </Button>
        </div>
      ) : (
        children
      )}
    </AppSidebar>
  )
}

export default function NgoDashboardLayout({ children }) {
  return (
    <NgoProfileProvider>
      <NgoShell>{children}</NgoShell>
    </NgoProfileProvider>
  )
}

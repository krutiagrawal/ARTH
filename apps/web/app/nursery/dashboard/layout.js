'use client'

import { useRouter } from 'next/navigation'
import { Home, Boxes, PackageSearch, Truck, ClipboardList, Leaf, Settings as SettingsIcon, LogOut, ChevronDown, Star, Users, WifiOff, Sprout } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import SidebarScenery from '@/components/dashboard/SidebarScenery'
import { Button } from '@/components/ui/button'
import AccountBlockedScreen from '@/components/dashboard/AccountBlockedScreen'
import { NurseryProfileProvider, useNurseryProfile } from './NurseryProfileContext'

const SECTIONS = [
  {
    items: [
      { label: 'Overview', href: '/nursery/dashboard', icon: Home, exact: true },
      { label: 'Inventory', href: '/nursery/dashboard/inventory', icon: Boxes },
      { label: 'Orders', href: '/nursery/dashboard/orders', icon: PackageSearch },
      { label: 'Pickup & Delivery', href: '/nursery/dashboard/pickup-delivery', icon: Truck },
      { label: 'Bulk Requirements', href: '/nursery/dashboard/requirements', icon: ClipboardList },
      { label: 'Impact', href: '/nursery/dashboard/impact', icon: Leaf },
      { label: 'Reviews', href: '/nursery/dashboard/reviews', icon: Star },
      { label: 'Followers', href: '/nursery/dashboard/followers', icon: Users },
      { label: 'Settings', href: '/nursery/dashboard/settings', icon: SettingsIcon },
    ],
  },
]

function NurseryShell({ children }) {
  const router = useRouter()
  const { profile, loading, error, blocked, blockReason, refresh } = useNurseryProfile()

  const logout = async () => {
    await fetch('/api/nursery/logout', { method: 'POST' })
    router.push('/nursery/login')
  }

  const nurseryName = loading ? 'Loading…' : profile?.nurseryName || 'Your nursery'
  const initial = (profile?.nurseryName || 'N').charAt(0).toUpperCase()

  if (blocked) return <AccountBlockedScreen reason={blockReason} onSignOut={logout} />

  return (
    <AppSidebar
      sections={SECTIONS}
      mobileTitle="Nursery Dashboard"
      scenery={<SidebarScenery />}
      header={
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Sprout className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">Nursery Dashboard</p>
            <p className="text-sm font-medium truncate">{nurseryName}</p>
          </div>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent transition-colors"
            onClick={() => router.push('/nursery/dashboard/settings')}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{nurseryName}</span>
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

export default function NurseryDashboardLayout({ children }) {
  return (
    <NurseryProfileProvider>
      <NurseryShell>{children}</NurseryShell>
    </NurseryProfileProvider>
  )
}

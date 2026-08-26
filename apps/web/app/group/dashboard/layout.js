'use client'

import { useRouter } from 'next/navigation'
import { Home, Users, Trophy, Settings as SettingsIcon, LogOut, ChevronDown, WifiOff } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import SidebarScenery from '@/components/dashboard/SidebarScenery'
import { Button } from '@/components/ui/button'
import { GroupProfileProvider, useGroupProfile } from './GroupProfileContext'

const SECTIONS = [
  {
    items: [
      { label: 'Overview', href: '/group/dashboard', icon: Home, exact: true },
      { label: 'Members', href: '/group/dashboard/members', icon: Users },
      { label: 'Challenges', href: '/group/dashboard/challenges', icon: Trophy },
      { label: 'Settings', href: '/group/dashboard/settings', icon: SettingsIcon },
    ],
  },
]

function GroupShell({ children }) {
  const router = useRouter()
  const { profile, loading, error, refresh } = useGroupProfile()

  const logout = async () => {
    await fetch('/api/group/logout', { method: 'POST' })
    router.push('/group/login')
  }

  const groupName = loading ? 'Loading…' : profile?.groupName || 'Your group'
  const initial = (profile?.groupName || 'G').charAt(0).toUpperCase()

  return (
    <AppSidebar
      sections={SECTIONS}
      mobileTitle="Group Dashboard"
      scenery={<SidebarScenery />}
      header={
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">Group Dashboard</p>
            <p className="text-sm font-medium truncate">{groupName}</p>
          </div>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-sidebar-accent transition-colors"
            onClick={() => router.push('/group/dashboard/settings')}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{groupName}</span>
              <span className="block text-xs text-sidebar-foreground/60">Owner</span>
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
            {error} Your session is fine — this isn&rsquo;t a login problem, the API just isn&rsquo;t responding right now.
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

export default function GroupDashboardLayout({ children }) {
  return (
    <GroupProfileProvider>
      <GroupShell>{children}</GroupShell>
    </GroupProfileProvider>
  )
}

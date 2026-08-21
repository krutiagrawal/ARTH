'use client'

import { useRouter } from 'next/navigation'
import { Home, ShieldCheck, FileStack, Flag, ScrollText, LogOut, ShieldAlert } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import { Button } from '@/components/ui/button'

const API_ADMIN_REASON = 'Sign in as the NGO-approvals admin to access this.'
const WEB_ADMIN_REASON = 'Sign in with your ARTH account (isAdmin) to access this.'

export default function AdminShell({ hasWebAdmin, hasApiAdminCookie, adminName, children }) {
  const router = useRouter()

  const sections = [
    {
      label: 'Platform',
      items: [{ label: 'Overview', href: '/admin', icon: Home, exact: true }],
    },
    {
      label: 'NGOs',
      items: [
        { label: 'Approvals', href: '/admin/ngos', icon: ShieldCheck, disabled: !hasApiAdminCookie, disabledReason: API_ADMIN_REASON },
        { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText, disabled: !hasApiAdminCookie, disabledReason: API_ADMIN_REASON },
      ],
    },
    {
      label: 'Content',
      items: [
        { label: 'CMS', href: '/admin/content', icon: FileStack, disabled: !hasWebAdmin, disabledReason: WEB_ADMIN_REASON },
        { label: 'Competitions', href: '/admin/competitions', icon: Flag, disabled: !hasWebAdmin, disabledReason: WEB_ADMIN_REASON },
      ],
    },
  ]

  const logoutApiAdmin = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.refresh()
  }
  const logoutWebAdmin = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <AppSidebar
      sections={sections}
      mobileTitle="Admin"
      header={
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-sidebar-foreground/60 truncate">ARTH Admin</p>
            <p className="text-sm font-medium truncate">{adminName || 'Console'}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col gap-1">
          {hasApiAdminCookie && (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logoutApiAdmin}>
              <LogOut className="h-4 w-4" /> Sign out (NGO admin)
            </Button>
          )}
          {hasWebAdmin && (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logoutWebAdmin}>
              <LogOut className="h-4 w-4" /> Sign out (Content admin)
            </Button>
          )}
          {!hasApiAdminCookie && !hasWebAdmin && (
            <p className="px-2 text-xs text-sidebar-foreground/60">Not signed in to either admin.</p>
          )}
        </div>
      }
    >
      {children}
    </AppSidebar>
  )
}

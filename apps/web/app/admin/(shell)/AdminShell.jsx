'use client'

import { useRouter } from 'next/navigation'
import {
  Home,
  ShieldCheck,
  FileStack,
  Flag,
  ScrollText,
  LogOut,
  ShieldAlert,
  Users,
  Sprout,
  Building2,
  Search,
  ShieldBan,
  PackageSearch,
  TreePine,
  BookOpen,
} from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import { Button } from '@/components/ui/button'

const ADMIN_REASON = 'Sign in as an admin to access this.'

export default function AdminShell({ hasAdmin, adminName, children }) {
  const router = useRouter()

  const sections = [
    {
      label: 'Platform',
      items: [{ label: 'Overview', href: '/admin', icon: Home, exact: true }],
    },
    {
      label: 'Trust & safety',
      items: [
        { label: 'Accounts', href: '/admin/accounts', icon: Search, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Reports', href: '/admin/reports', icon: ShieldBan, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Tree verification', href: '/admin/tree-verification', icon: TreePine, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
      ],
    },
    {
      label: 'NGOs',
      items: [
        { label: 'Approvals', href: '/admin/ngos', icon: ShieldCheck, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
      ],
    },
    {
      label: 'Nurseries & corporates',
      items: [
        { label: 'Nurseries', href: '/admin/nurseries', icon: Sprout, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Corporates', href: '/admin/corporates', icon: Building2, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
      ],
    },
    {
      label: 'Groups',
      items: [{ label: 'Groups', href: '/admin/groups', icon: Users, disabled: !hasAdmin, disabledReason: ADMIN_REASON }],
    },
    {
      label: 'Operations',
      items: [{ label: 'Drives, donations & orders', href: '/admin/ops', icon: PackageSearch, disabled: !hasAdmin, disabledReason: ADMIN_REASON }],
    },
    {
      label: 'Content',
      items: [
        { label: 'CMS', href: '/admin/content', icon: FileStack, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Competitions', href: '/admin/competitions', icon: Flag, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
        { label: 'Catalog', href: '/admin/catalog', icon: BookOpen, disabled: !hasAdmin, disabledReason: ADMIN_REASON },
      ],
    },
  ]

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
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
          {hasAdmin ? (
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <p className="px-2 text-xs text-sidebar-foreground/60">Not signed in.</p>
          )}
        </div>
      }
    >
      {children}
    </AppSidebar>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

function NavLink({ item }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`)
  const Icon = item.icon

  if (item.disabled) {
    return (
      <SidebarMenuButton disabled title={item.disabledReason}>
        <span className="flex items-center gap-2 opacity-50">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
        </span>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton asChild isActive={isActive}>
      <Link href={item.href}>
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
      </Link>
    </SidebarMenuButton>
  )
}

/**
 * Shared app-shell sidebar for the NGO and Admin dashboards.
 * `sections`: { label?: string, items: { label, href, icon?, disabled?, disabledReason?, exact? }[] }[]
 * `scenery`: optional decorative node filling remaining sidebar height below
 * the nav (e.g. SidebarScenery for the NGO shell). Admin simply never passes
 * it, which is the entire mechanism keeping the admin sidebar plain.
 */
export default function AppSidebar({ sections, header, footer, scenery, mobileTitle = 'Menu', children }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>{header}</SidebarHeader>
        <SidebarContent className={scenery ? 'flex-none' : undefined}>
          {sections.map((section, i) => (
            <SidebarGroup key={section.label || i}>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href || item.label}>
                      <NavLink item={item} />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        {scenery && <div className="flex-1 min-h-0 overflow-hidden">{scenery}</div>}
        {footer && <SidebarFooter>{footer}</SidebarFooter>}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4 md:hidden">
          <SidebarTrigger />
          <span className="eyebrow text-primary">{mobileTitle}</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

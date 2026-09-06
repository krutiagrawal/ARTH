import Navbar from '@/components/site/Navbar'
import DashboardSidebar from '@/components/dashboard-individual/DashboardSidebar'
import RequireIndividualUser from '@/components/dashboard-individual/RequireIndividualUser'

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

// App-shell layout, not a scrolling marketing page: the sidebar must always
// stay fully visible, so the outer frame is pinned to the viewport height and
// only <main> scrolls internally. No site Footer here on purpose — it belongs
// to the marketing pages, not an authenticated app view.
export default function IndividualDashboardLayout({ children }) {
  return (
    <div className="h-screen overflow-hidden bg-background">
      <Navbar />
      <RequireIndividualUser>
        <div className="pt-16 md:pt-20 h-full flex flex-col md:flex-row">
          <DashboardSidebar />
          <main className="flex-1 min-w-0 h-full overflow-y-auto">{children}</main>
        </div>
      </RequireIndividualUser>
    </div>
  )
}

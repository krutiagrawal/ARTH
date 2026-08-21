import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/session'
import AdminShell from './AdminShell'

// There are two independent admin identities in this app:
//  - the services/api-backed NGO-approval admin (admin_refresh_token /
//    admin_access_token cookies, a services/api User with role:'admin')
//  - the Arth-native content admin (arth_session cookie, apps/web's own
//    User.isAdmin boolean), which gates /admin/content and /admin/competitions
// They don't share a login, a database, or a session mechanism. Rather than
// forcing a migration, this shell shows both identities side by side and lets
// each section degrade independently depending on which one is currently
// signed in — see AdminShell.jsx for how nav items reflect that.
export default async function AdminShellLayout({ children }) {
  const [user, cookieStore] = await Promise.all([getServerUser(), cookies()])
  const hasWebAdmin = Boolean(user?.isAdmin)
  const hasApiAdminCookie = Boolean(cookieStore.get('admin_refresh_token')?.value)

  return (
    <AdminShell hasWebAdmin={hasWebAdmin} hasApiAdminCookie={hasApiAdminCookie} adminName={user?.name}>
      {children}
    </AdminShell>
  )
}

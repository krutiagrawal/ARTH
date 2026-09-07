import { cookies } from 'next/headers'
import { requireApiAdmin } from '@/lib/requireApiAdmin'
import AccountBlockedScreen from '@/components/dashboard/AccountBlockedScreen'
import AdminShell from './AdminShell'

// The services/api-backed admin session (admin_access_token/admin_refresh_token
// cookies, a services/api User with role:'admin') is the only admin identity now.
export default async function AdminShellLayout({ children }) {
  const cookieStore = await cookies()
  const admin = await requireApiAdmin({ cookies: cookieStore })

  if (admin?.blocked) return <AccountBlockedScreen reason={admin.blockReason} />

  return (
    <AdminShell hasAdmin={Boolean(admin)} adminName={admin?.name}>
      {children}
    </AdminShell>
  )
}

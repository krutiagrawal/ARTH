// Dashboard pages are per-user and some read Postgres directly; render per request, never at build time.
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }) {
  return children
}

import AdminReportsClient from './AdminReportsClient'

export const metadata = {
  title: 'Reports',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminReportsClient />
}

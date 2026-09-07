import AdminNurseriesClient from './AdminNurseriesClient'

export const metadata = {
  title: 'Nursery approvals',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminNurseriesClient />
}

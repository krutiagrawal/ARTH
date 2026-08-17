import AdminNgosClient from './AdminNgosClient'

export const metadata = {
  title: 'NGO approvals',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminNgosClient />
}

import AdminCorporatesClient from './AdminCorporatesClient'

export const metadata = {
  title: 'Corporate approvals',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminCorporatesClient />
}

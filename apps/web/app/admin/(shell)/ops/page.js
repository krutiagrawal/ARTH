import AdminOpsClient from './AdminOpsClient'

export const metadata = {
  title: 'Operations',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminOpsClient />
}

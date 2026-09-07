import AdminAccountsClient from './AdminAccountsClient'

export const metadata = {
  title: 'Accounts',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminAccountsClient />
}

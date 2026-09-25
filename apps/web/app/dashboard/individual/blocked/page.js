import BlockedClient from './BlockedClient'

export const metadata = {
  title: 'Blocked Accounts · Dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <BlockedClient />
}

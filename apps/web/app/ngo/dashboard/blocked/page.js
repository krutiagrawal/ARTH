import BlockedClient from './BlockedClient'

export const metadata = {
  title: 'Blocked Accounts · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <BlockedClient />
}

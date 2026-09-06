import MyDonationsClient from './MyDonationsClient'

export const metadata = {
  title: 'My Donations',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MyDonationsClient />
}

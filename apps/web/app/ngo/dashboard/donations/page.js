import DonationsClient from './DonationsClient'

export const metadata = { title: 'Donations · NGO dashboard', robots: { index: false, follow: false } }

export default function Page() {
  return <DonationsClient />
}

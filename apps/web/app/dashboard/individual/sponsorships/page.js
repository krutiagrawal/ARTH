import SponsorshipsClient from './SponsorshipsClient'

export const metadata = {
  title: 'My Sponsorships · Dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SponsorshipsClient />
}

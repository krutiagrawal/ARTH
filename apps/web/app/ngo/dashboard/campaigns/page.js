import CampaignsClient from './CampaignsClient'

export const metadata = {
  title: 'Campaigns · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CampaignsClient />
}

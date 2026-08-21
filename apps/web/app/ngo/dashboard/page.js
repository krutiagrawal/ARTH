import OverviewClient from './OverviewClient'

export const metadata = {
  title: 'NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <OverviewClient />
}

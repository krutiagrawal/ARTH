import OverviewClient from './OverviewClient'

export const metadata = {
  title: 'Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <OverviewClient />
}

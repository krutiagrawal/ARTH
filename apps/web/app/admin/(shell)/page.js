import OverviewClient from './OverviewClient'

export const metadata = {
  title: 'Admin overview',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <OverviewClient />
}

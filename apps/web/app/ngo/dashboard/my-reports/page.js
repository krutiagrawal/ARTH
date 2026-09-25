import ReportsClient from './ReportsClient'

export const metadata = {
  title: 'My Reports · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ReportsClient />
}

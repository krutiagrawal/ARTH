import ReportsClient from './ReportsClient'

export const metadata = {
  title: 'My Reports · Dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ReportsClient />
}

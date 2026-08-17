import NgoDashboardClient from './NgoDashboardClient'

export const metadata = {
  title: 'NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NgoDashboardClient />
}

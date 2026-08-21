import DrivesClient from './DrivesClient'

export const metadata = {
  title: 'Drives · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <DrivesClient />
}

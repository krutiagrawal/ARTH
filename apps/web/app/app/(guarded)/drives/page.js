import DrivesListClient from './DrivesListClient'

export const metadata = {
  title: 'Drives',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <DrivesListClient />
}

import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import DrivesClient from './DrivesClient'

export const metadata = {
  title: 'Drives',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <DashboardPageShell>
      <DrivesClient />
    </DashboardPageShell>
  )
}

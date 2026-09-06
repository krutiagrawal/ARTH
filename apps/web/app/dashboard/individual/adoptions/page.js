import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import AdoptionsClient from './AdoptionsClient'

export const metadata = {
  title: 'Adopt a tree',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <DashboardPageShell>
      <AdoptionsClient />
    </DashboardPageShell>
  )
}

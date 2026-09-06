import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import DriveDetailClient from './DriveDetailClient'

export const metadata = {
  title: 'Drive',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return (
    <DashboardPageShell>
      <DriveDetailClient driveId={id} />
    </DashboardPageShell>
  )
}

import DashboardPageShell from '@/components/dashboard/DashboardPageShell'
import AdoptionDetailClient from './AdoptionDetailClient'

export const metadata = {
  title: 'Adopt a tree',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return (
    <DashboardPageShell>
      <AdoptionDetailClient treeId={id} />
    </DashboardPageShell>
  )
}

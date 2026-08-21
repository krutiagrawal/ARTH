import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/session'
import CompetitionModerationClient from './CompetitionModerationClient'

export const metadata = {
  title: 'Competition entries · Admin',
  robots: { index: false, follow: false },
}

export default async function Page() {
  const user = await getServerUser()
  if (!user) redirect('/login?next=/admin/competitions')
  if (!user.isAdmin) redirect('/')

  return <CompetitionModerationClient />
}

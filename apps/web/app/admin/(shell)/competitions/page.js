import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireApiAdmin } from '@/lib/requireApiAdmin'
import CompetitionModerationClient from './CompetitionModerationClient'

export const metadata = {
  title: 'Competition entries · Admin',
  robots: { index: false, follow: false },
}

export default async function Page() {
  const admin = await requireApiAdmin({ cookies: await cookies() })
  if (!admin) redirect('/admin/login?next=/admin/competitions')

  return <CompetitionModerationClient />
}

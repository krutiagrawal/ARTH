import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/session'
import AdminContentClient from './AdminContentClient'

export const metadata = {
  title: 'Admin · Content',
  robots: { index: false, follow: false },
}

export default async function Page() {
  const user = await getServerUser()
  if (!user) redirect('/login?next=/admin/content')
  if (!user.isAdmin) redirect('/')

  return <AdminContentClient />
}

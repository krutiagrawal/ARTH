import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireApiAdmin } from '@/lib/requireApiAdmin'
import AdminContentClient from './AdminContentClient'

export const metadata = {
  title: 'Admin · Content',
  robots: { index: false, follow: false },
}

export default async function Page() {
  const admin = await requireApiAdmin({ cookies: await cookies() })
  if (!admin) redirect('/admin/login?next=/admin/content')

  return <AdminContentClient />
}

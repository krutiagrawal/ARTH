import AdminAccountProfileClient from './AdminAccountProfileClient'

export const metadata = {
  title: 'Account profile',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <AdminAccountProfileClient userId={id} />
}

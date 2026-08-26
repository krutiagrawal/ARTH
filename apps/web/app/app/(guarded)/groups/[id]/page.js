import GroupDetailClient from './GroupDetailClient'

export const metadata = {
  title: 'Group',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <GroupDetailClient groupId={id} />
}

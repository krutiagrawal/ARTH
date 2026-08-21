import DriveDetailClient from './DriveDetailClient'

export const metadata = {
  title: 'Drive',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <DriveDetailClient driveId={id} />
}

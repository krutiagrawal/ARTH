import ZonesClient from './ZonesClient'

export const metadata = { title: 'Plantation zones · NGO dashboard', robots: { index: false, follow: false } }

export default async function Page({ params }) {
  const { driveId } = await params
  return <ZonesClient driveId={driveId} />
}

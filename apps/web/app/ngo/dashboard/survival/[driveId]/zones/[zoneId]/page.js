import TreesClient from './TreesClient'

export const metadata = { title: 'Zone trees · NGO dashboard', robots: { index: false, follow: false } }

export default async function Page({ params }) {
  const { driveId, zoneId } = await params
  return <TreesClient driveId={driveId} zoneId={zoneId} />
}

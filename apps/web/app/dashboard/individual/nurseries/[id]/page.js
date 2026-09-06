import NurseryDetailClient from './NurseryDetailClient'

export const metadata = {
  title: 'Nursery',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <NurseryDetailClient nurseryId={id} />
}

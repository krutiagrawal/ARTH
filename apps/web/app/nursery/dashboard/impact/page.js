import ImpactClient from './ImpactClient'

export const metadata = {
  title: 'Impact · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ImpactClient />
}

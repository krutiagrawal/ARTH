import NurseriesClient from './NurseriesClient'

export const metadata = {
  title: 'Nurseries',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NurseriesClient />
}

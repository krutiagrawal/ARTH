import RequirementsClient from './RequirementsClient'

export const metadata = {
  title: 'Bulk Requirements · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <RequirementsClient />
}

import RequirementsClient from './RequirementsClient'

export const metadata = {
  title: 'Bulk Requirements · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <RequirementsClient />
}

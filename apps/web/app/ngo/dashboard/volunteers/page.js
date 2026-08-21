import VolunteersClient from './VolunteersClient'

export const metadata = { title: 'Volunteers · NGO dashboard', robots: { index: false, follow: false } }

export default function Page() {
  return <VolunteersClient />
}

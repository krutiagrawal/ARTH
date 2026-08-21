import StaffClient from './StaffClient'

export const metadata = { title: 'Staff · NGO dashboard', robots: { index: false, follow: false } }

export default function Page() {
  return <StaffClient />
}

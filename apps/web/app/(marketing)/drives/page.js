import DrivesListClient from '../../app/(guarded)/drives/DrivesListClient'

export const metadata = {
  title: 'Drives',
  description: 'Join a plantation drive near you — RSVP and show up with your hands.',
}

export default function Page() {
  return <DrivesListClient />
}

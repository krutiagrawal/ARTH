import SettingsClient from './SettingsClient'

export const metadata = {
  title: 'Settings · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SettingsClient />
}

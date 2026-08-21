import SettingsClient from './SettingsClient'

export const metadata = {
  title: 'Settings · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SettingsClient />
}

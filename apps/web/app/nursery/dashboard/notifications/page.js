import NotificationsClient from './NotificationsClient'

export const metadata = {
  title: 'Notifications · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NotificationsClient />
}

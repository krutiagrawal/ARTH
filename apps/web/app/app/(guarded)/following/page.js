import FollowingClient from './FollowingClient'

export const metadata = {
  title: 'Following',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <FollowingClient />
}

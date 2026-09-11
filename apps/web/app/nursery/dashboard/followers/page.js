import FollowersClient from './FollowersClient'

export const metadata = {
  title: 'Followers · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <FollowersClient />
}

import FollowersClient from './FollowersClient'

export const metadata = {
  title: 'Followers · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <FollowersClient />
}

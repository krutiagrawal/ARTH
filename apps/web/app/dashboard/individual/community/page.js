import CommunityClient from './CommunityClient'

export const metadata = {
  title: 'Community',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CommunityClient />
}

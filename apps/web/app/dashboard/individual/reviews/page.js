import ReviewsClient from './ReviewsClient'

export const metadata = {
  title: 'My Reviews · Dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ReviewsClient />
}

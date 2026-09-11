import ReviewsClient from './ReviewsClient'

export const metadata = {
  title: 'Reviews · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ReviewsClient />
}

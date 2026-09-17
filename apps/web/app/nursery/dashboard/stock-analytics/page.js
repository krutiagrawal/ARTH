import StockAnalyticsClient from './StockAnalyticsClient'

export const metadata = {
  title: 'Stock Analytics · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <StockAnalyticsClient />
}

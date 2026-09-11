import OrdersClient from './OrdersClient'

export const metadata = {
  title: 'Orders · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <OrdersClient />
}

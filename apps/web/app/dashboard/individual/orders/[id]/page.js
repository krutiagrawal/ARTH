import OrderDetailClient from './OrderDetailClient'

export const metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <OrderDetailClient orderId={id} />
}

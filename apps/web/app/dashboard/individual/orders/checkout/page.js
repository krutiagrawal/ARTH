import CheckoutClient from './CheckoutClient'

export const metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CheckoutClient />
}

import CartClient from './CartClient'

export const metadata = {
  title: 'Cart',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CartClient />
}

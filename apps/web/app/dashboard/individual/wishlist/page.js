import WishlistClient from './WishlistClient'

export const metadata = {
  title: 'Wishlist',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <WishlistClient />
}

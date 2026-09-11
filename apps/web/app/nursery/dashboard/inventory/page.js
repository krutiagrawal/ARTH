import InventoryClient from './InventoryClient'

export const metadata = {
  title: 'Inventory · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <InventoryClient />
}

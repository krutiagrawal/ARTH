import AdminCatalogClient from './AdminCatalogClient'

export const metadata = {
  title: 'Catalog',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminCatalogClient />
}

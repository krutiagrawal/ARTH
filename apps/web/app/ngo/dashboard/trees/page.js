import TreesClient from './TreesClient'

export const metadata = {
  title: 'Adoptable trees · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <TreesClient />
}

import BrowseClient from './BrowseClient'

export const metadata = {
  title: 'Browse · NGO dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <BrowseClient />
}

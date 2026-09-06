import TreesClient from './TreesClient'

export const metadata = {
  title: 'My Trees',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <TreesClient />
}

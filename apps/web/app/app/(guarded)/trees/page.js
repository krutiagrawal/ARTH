import TreesListClient from './TreesListClient'

export const metadata = {
  title: 'Adopt a tree',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <TreesListClient />
}

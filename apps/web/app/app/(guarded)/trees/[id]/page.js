import TreeDetailClient from './TreeDetailClient'

export const metadata = {
  title: 'Adopt a tree',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <TreeDetailClient treeId={id} />
}

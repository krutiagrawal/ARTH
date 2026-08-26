import TreesListClient from '../../app/(guarded)/trees/TreesListClient'

export const metadata = {
  title: 'Adopt a tree',
  description: 'Adopt a legacy tree and follow its story — real trees, cared for by real people.',
}

export default function Page() {
  return <TreesListClient />
}

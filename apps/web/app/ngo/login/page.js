import NgoLoginClient from './NgoLoginClient'

export const metadata = {
  title: 'NGO sign in',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <NgoLoginClient />
}

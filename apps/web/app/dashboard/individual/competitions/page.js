import MyCompetitionsClient from './MyCompetitionsClient'

export const metadata = {
  title: 'My Competitions',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MyCompetitionsClient />
}

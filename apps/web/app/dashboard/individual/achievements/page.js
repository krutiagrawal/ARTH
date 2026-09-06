import AchievementsClient from './AchievementsClient'

export const metadata = {
  title: 'Achievements',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AchievementsClient />
}

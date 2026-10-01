import OnboardingClient from './OnboardingClient'

export const metadata = {
  title: 'Personalize your experience',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <OnboardingClient />
}

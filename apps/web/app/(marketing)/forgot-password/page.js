import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ForgotPasswordClient />
}

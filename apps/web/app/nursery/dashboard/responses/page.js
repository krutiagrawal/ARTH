import ResponsesClient from './ResponsesClient'

export const metadata = {
  title: 'My Responses · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ResponsesClient />
}

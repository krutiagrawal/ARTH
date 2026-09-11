import PrintQrSheetClient from './PrintQrSheetClient'

export const metadata = {
  title: 'Print QR sheet · Nursery dashboard',
  robots: { index: false, follow: false },
}

export default async function Page({ params }) {
  const { id } = await params
  return <PrintQrSheetClient orderId={id} />
}

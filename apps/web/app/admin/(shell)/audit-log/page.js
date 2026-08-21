import AuditLogClient from './AuditLogClient'

export const metadata = {
  title: 'Audit log · Admin',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AuditLogClient />
}

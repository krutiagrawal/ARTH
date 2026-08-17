import { Resend } from 'resend'

let client = null

function getClient() {
  if (!process.env.RESEND_API_KEY) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail({ to, subject, html }) {
  const resend = getClient()
  const from = process.env.EMAIL_FROM || 'ARTH <hello@arth.example.org>'

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send. Would have sent "${subject}" to ${to}.\n${html}`)
    return { skipped: true }
  }

  return resend.emails.send({ from, to, subject, html })
}

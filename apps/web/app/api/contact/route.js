import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { clientIp, isRateLimited } from '@/lib/rateLimit'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
})

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
// Visitor-supplied text goes into an HTML email to the team, so markup must be shown as text, not run.
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])

export async function POST(request) {
  if (isRateLimited(`contact:${clientIp(request)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in your name, email and a message.' }, { status: 400 })
  }

  const { name, email, subject, message } = parsed.data
  await sendEmail({
    to: process.env.EMAIL_FROM || 'hello@arth.earth',
    // Line breaks in a subject would let a visitor inject extra mail headers.
    subject: (subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`).replace(/[\r\n]+/g, ' '),
    html: `<p><strong>From:</strong> ${esc(name)} (${esc(email)})</p><p>${esc(message).replace(/\n/g, '<br/>')}</p>`,
  })

  return NextResponse.json({ ok: true })
}

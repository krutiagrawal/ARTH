import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(1),
})

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please fill in your name, email and a message.' }, { status: 400 })
  }

  const { name, email, subject, message } = parsed.data
  await sendEmail({
    to: process.env.EMAIL_FROM || 'hello@arth.earth',
    subject: subject ? `[Contact] ${subject}` : `[Contact] Message from ${name}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
  })

  return NextResponse.json({ ok: true })
}

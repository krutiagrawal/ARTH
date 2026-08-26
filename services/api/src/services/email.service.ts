import { Resend } from 'resend';
import { env } from '../config/env';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const resend = getClient();

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send. Would have sent "${subject}" to ${to}.\n${html}`);
    return { skipped: true as const };
  }

  return resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
}

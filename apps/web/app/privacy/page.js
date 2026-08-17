import SectionWrapper from '@/components/site/SectionWrapper'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How ARTH collects, uses and protects your information.',
}

const SECTIONS = [
  {
    h: 'What we collect',
    p: 'When you create an account we store your name, email, account type and, if you share it, your city. When you plant a tree, adopt a legacy tree, RSVP to a drive or make a pledge, we store that activity against your account so your dashboard and impact stay accurate.',
  },
  {
    h: 'How we use it',
    p: 'Your information is used to run your account, show your activity back to you, and — only with your consent — send occasional updates if you subscribe to our newsletter. We do not sell your data to third parties.',
  },
  {
    h: 'Payments',
    p: 'Donations are processed by Stripe. ARTH never sees or stores your card details — Stripe handles that directly and shares only the outcome (succeeded or failed) with us.',
  },
  {
    h: 'Cookies',
    p: 'We use a single essential cookie to keep you signed in. We do not use third-party advertising or tracking cookies.',
  },
  {
    h: 'Your choices',
    p: 'You can update your account details from your dashboard, unsubscribe from the newsletter at any time, or write to us at hello@arth.earth to request your data be deleted.',
  },
]

export default function Page() {
  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Legal" title="Privacy Policy" lede="Plain language, no fine print games. Last updated 2026.">
        <div className="max-w-3xl space-y-10">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h3 className="font-serif text-2xl">{s.h}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.p}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

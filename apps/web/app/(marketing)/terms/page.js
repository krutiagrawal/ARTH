import SectionWrapper from '@/components/site/SectionWrapper'

export const metadata = {
  title: 'Terms of Service',
  description: "The terms that govern using ARTH's website and services.",
}

const SECTIONS = [
  {
    h: 'Using ARTH',
    p: 'ARTH is a platform for planting, tracking and supporting real trees. You must be at least 13 years old to create an account. You are responsible for the accuracy of what you log – planted trees, adoptions, RSVPs and pledges should reflect real activity.',
  },
  {
    h: 'NGO accounts',
    p: 'Organizations that register as NGOs are reviewed before being approved to create drives, list adoptable trees or run donation campaigns. ARTH can reject or revoke an NGO account at its discretion if information provided is false or misleading.',
  },
  {
    h: 'Donations',
    p: 'Donations made through ARTH are voluntary contributions to the NGO or cause you select. Once processed by Stripe, donations are generally non-refundable, except where required by law or at the discretion of the receiving organization.',
  },
  {
    h: 'Content you share',
    p: 'You retain ownership of anything you post – journal comments, photos, competition entries. By posting, you grant ARTH a license to display it on the platform in connection with your account and activity.',
  },
  {
    h: 'Changes',
    p: 'We may update these terms as ARTH grows. Meaningful changes will be reflected here with an updated date.',
  },
]

export default function Page() {
  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Legal" title="Terms of Service" lede="The agreement between you and ARTH. Last updated 2026.">
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

import SectionWrapper from '@/components/site/SectionWrapper'

export const metadata = {
  title: 'FAQ',
  description: 'Answers to common questions about planting, donating and joining ARTH.',
}

const FAQS = [
  { q: 'Is ARTH free to use?', a: 'Yes. Creating an account, logging planted trees, adopting a legacy tree and joining drives are all free. Donations are entirely optional.' },
  { q: 'How do I know a donation actually reaches a tree?', a: 'Every NGO on ARTH is reviewed before approval, and drives are photographed and geo-tagged. We are working toward showing donors exactly which drive their pledge funded.' },
  { q: 'Can my school or company join?', a: 'Yes – choose "Organisation / CSR" when you register, or reach out through the Contact page for a coordinated partnership.' },
  { q: 'How is this different from just donating to any NGO?', a: 'ARTH tracks planting activity over time, not just a one-off donation – so you can watch a tree, a drive or a whole forest grow.' },
  { q: 'What happens to my data?', a: 'See our Privacy Policy – in short, we only use your information to run your account and never sell it.' },
]

export default function Page() {
  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Help" title="Frequently asked questions" lede="If your question isn't here, write to us – we read every letter.">
        <div className="max-w-3xl divide-y divide-border/70 border-t border-border/70">
          {FAQS.map((f) => (
            <div key={f.q} className="py-8">
              <h3 className="font-serif text-xl">{f.q}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  )
}

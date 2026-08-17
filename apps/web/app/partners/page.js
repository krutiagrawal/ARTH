import { prisma } from '@/lib/prisma'
import SectionWrapper from '@/components/site/SectionWrapper'

export const metadata = {
  title: 'Partners',
  description: 'The NGOs, nurseries and organisations working with ARTH on the ground.',
}

export default async function App() {
  const partners = await prisma.partner.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }] })
  const groups = []
  for (const p of partners) {
    let group = groups.find((g) => g.group === p.group)
    if (!group) {
      group = { group: p.group, names: [] }
      groups.push(group)
    }
    group.names.push(p.name)
  }

  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Partners" title="The kind institutions holding us up." align="center" lede="CSR companies, NGOs, nurseries, schools and universities — without whom no forest in this movement would exist." />
      <div className="container space-y-14">
        {groups.map(p => (
          <div key={p.group}>
            <h3 className="font-serif text-3xl mb-6">{p.group}</h3>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {p.names.map(n => (
                <div key={n} className="rounded-2xl border border-border/70 bg-card px-4 py-6 text-center leaf-shadow hover:border-primary/40 transition">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-primary/15 grid place-items-center text-primary"><span className="font-serif">{n[0]}</span></div>
                  <div className="font-serif text-lg">{n}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

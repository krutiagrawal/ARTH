import { prisma } from '@/lib/prisma'
import SectionWrapper from '@/components/site/SectionWrapper'
import PartnerWall from '@/components/site/PartnerWall'

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
      group = { group: p.group, items: [] }
      groups.push(group)
    }
    group.items.push({ id: p.id, name: p.name, logoUrl: p.logoUrl })
  }

  return (
    <div className="pt-32">
      <SectionWrapper eyebrow="Partners" title="The kind institutions holding us up." align="center" lede="CSR companies, NGOs, nurseries, schools and universities – without whom no forest in this movement would exist." />
      <div className="container pb-32">
        <div className="divide-y divide-foreground/10">
          {groups.map((g) => (
            <div key={g.group} className="py-14 md:py-20">
              <p className="eyebrow text-center mb-10 md:mb-14">{g.group}</p>
              <PartnerWall partners={g.items} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

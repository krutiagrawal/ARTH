'use client'
import PartnerMark from './PartnerMark'

// A logo wall, not a carousel: no cards, no borders, no motion — just marks
// with generous air between them. Real logos (once set via /admin/content)
// render as images; everything else gets a generated icon mark (see
// PartnerMark) since these are seed/demo orgs with no real logo to fetch.
export default function PartnerWall({ partners }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-10 md:gap-x-16">
      {partners.map((p) => (
        <div key={p.id} className="group flex w-28 flex-col items-center gap-3 text-center">
          {p.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logoUrl}
              alt={p.name}
              className="h-12 md:h-14 w-auto max-w-[160px] object-contain grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
            />
          ) : (
            <span className="transition-transform duration-300 group-hover:scale-110">
              <PartnerMark name={p.name} />
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-foreground leading-snug">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}

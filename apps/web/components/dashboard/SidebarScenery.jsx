/**
 * Decorative, hand-composed inline SVG scene for the NGO sidebar — muted
 * mountains, a stylized tree, a sun, a couple of birds, faint dotted
 * texture. No external image asset (none exists in the repo). Fades into
 * the sidebar background via a bottom mask so it blends rather than
 * hard-cutting.
 */
export default function SidebarScenery() {
  return (
    <div
      className="w-full h-full min-h-[140px]"
      style={{ maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)' }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 260 200" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
        <defs>
          <pattern id="scenery-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" className="fill-foreground" opacity="0.08" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="260" height="200" fill="url(#scenery-dots)" />

        {/* sun */}
        <circle cx="205" cy="40" r="20" className="fill-sand" opacity="0.85" />

        {/* birds */}
        <path d="M40 30 L46 25 L52 30" className="stroke-foreground" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M65 45 L70 41 L75 45" className="stroke-foreground" strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round" />

        {/* far mountains */}
        <path d="M0 130 L45 80 L90 120 L130 70 L175 125 L220 90 L260 130 L260 200 L0 200 Z" className="fill-sand" opacity="0.45" />
        {/* near mountains */}
        <path d="M0 160 L55 110 L100 150 L150 100 L200 155 L260 120 L260 200 L0 200 Z" className="fill-primary" opacity="0.5" />

        {/* tree */}
        <rect x="122" y="140" width="6" height="34" rx="2" className="fill-primary" opacity="0.8" />
        <circle cx="125" cy="130" r="20" className="fill-primary" opacity="0.75" />
        <circle cx="112" cy="140" r="14" className="fill-primary" opacity="0.7" />
        <circle cx="140" cy="140" r="14" className="fill-primary" opacity="0.7" />
      </svg>
    </div>
  )
}

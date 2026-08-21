'use client'

// Deterministic placeholder logomark for partners without a real logoUrl.
// These are seed/demo organizations (Aster Financial, Halcyon Hotels, etc.)
// that don't exist in the real world, so there is no real logo to source —
// generating a consistent abstract icon + small wordmark reads as an actual
// logo lockup instead of a name in giant type. Once a real logoUrl is set
// (via /admin/content), that image is used instead — see PartnerWall.jsx.

const PALETTE = ['#8FAE86', '#8B6F52', '#C08552', '#B99B5B', '#6E9089', '#9C8F7C']

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const ICONS = [
  // overlapping circles
  ({ color }) => (
    <>
      <circle cx="17" cy="24" r="12" fill={color} fillOpacity="0.85" />
      <circle cx="31" cy="24" r="12" fill={color} fillOpacity="0.45" />
    </>
  ),
  // triangle of dots
  ({ color }) => (
    <>
      <circle cx="24" cy="12" r="6" fill={color} />
      <circle cx="14" cy="30" r="6" fill={color} fillOpacity="0.6" />
      <circle cx="34" cy="30" r="6" fill={color} fillOpacity="0.6" />
    </>
  ),
  // crescent + dot
  ({ color }) => (
    <>
      <path d="M28 8a16 16 0 1 0 0 32 12.5 12.5 0 0 1 0-32Z" fill={color} fillOpacity="0.8" />
      <circle cx="33" cy="15" r="4" fill={color} />
    </>
  ),
  // diamond outline + center dot
  ({ color }) => (
    <>
      <path d="M24 6 L40 24 L24 42 L8 24 Z" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="24" cy="24" r="5" fill={color} />
    </>
  ),
  // leaf curve
  ({ color }) => (
    <path
      d="M10 38C10 20 22 8 40 8c0 18-12 30-30 30Zm0 0C10 30 16 22 26 18"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  // arc rings
  ({ color }) => (
    <>
      <circle cx="24" cy="24" r="16" fill="none" stroke={color} strokeWidth="3" strokeDasharray="70 40" />
      <circle cx="24" cy="24" r="7" fill={color} fillOpacity="0.7" />
    </>
  ),
]

export default function PartnerMark({ name }) {
  const hash = hashString(name)
  const color = PALETTE[hash % PALETTE.length]
  const Icon = ICONS[hash % ICONS.length]

  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 md:h-12 md:w-12" aria-hidden>
      <Icon color={color} />
    </svg>
  )
}

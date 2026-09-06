// Shown by Next.js in place of `children` while a marketing-route navigation is
// pending. Without this, the shared (marketing) layout's Footer — always mounted,
// just far below the fold on the cinematic homepage — briefly rides up right under
// the Navbar the instant the outgoing page unmounts, before the destination is
// ready. A plain full-height placeholder keeps that gap closed.
export default function Loading() {
  return <div className="min-h-screen bg-background" />
}

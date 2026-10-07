import './globals.css'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import { Providers } from './providers'

// Same pairing as the mobile app: Bricolage Grotesque for headings, Figtree for everything else.
// next/font self-hosts them at build time and exposes CSS variables used by globals.css and the
// Tailwind `font-sans` / `font-serif` families (kept as `font-serif` so existing classes still work).
const fontDisplay = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const fontBody = Figtree({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-body', display: 'swap' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const DEFAULT_TITLE = 'ARTH – Leave More Than Footprints.'
const DEFAULT_DESCRIPTION = 'A global environmental movement. Plant, track and leave a living legacy for the earth.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: '%s · ARTH' },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    siteName: 'ARTH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

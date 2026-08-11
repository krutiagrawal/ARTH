import './globals.css'
import { Providers } from './providers'
import Navbar from '@/components/site/Navbar'
import Footer from '@/components/site/Footer'
import BackgroundAmbience from '@/components/site/BackgroundAmbience'
import CustomCursor from '@/components/site/CustomCursor'

export const metadata = {
  title: 'ARTH — Leave More Than Footprints.',
  description: 'A global environmental movement. Plant, track and leave a living legacy for the earth.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <CustomCursor />
          <BackgroundAmbience />
          <Navbar />
          <main className="relative">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

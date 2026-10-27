import Navbar from '@/components/site/Navbar'
import Footer from '@/components/site/Footer'
import CustomCursor from '@/components/site/CustomCursor'

// Pages below read live content from Postgres (blogs, forests, leaderboards...); render per request so
// CMS edits show up without a redeploy and `next build` needs no database.
export const dynamic = 'force-dynamic'

export default function MarketingLayout({ children }) {
  return (
    <div className="marketing-cursor-none">
      <CustomCursor />
      <Navbar />
      <main className="relative">{children}</main>
      <Footer />
    </div>
  )
}

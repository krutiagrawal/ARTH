import Navbar from '@/components/site/Navbar'
import Footer from '@/components/site/Footer'
import CustomCursor from '@/components/site/CustomCursor'

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

import Link from 'next/link'
import { Instagram, Twitter, Youtube, Github, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-foreground/15 bg-background">
      <div className="px-5 md:px-10 py-16 md:py-24">
        {/* Big brand row */}
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-8">
            <p className="eyebrow">ARTH · Est. 2016</p>
            <h3 className="display text-6xl md:text-8xl mt-4">Leave more than<br/><em className="text-primary">footprints</em>.</h3>
          </div>
          <div className="col-span-12 md:col-span-4 md:pb-6">
            <form className="flex items-center gap-2 rounded-full border border-foreground/25 pl-4 pr-1 py-1">
              <input type="email" placeholder="Your email for gentle letters" className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <button type="submit" className="h-10 rounded-full bg-foreground text-background px-4 text-sm">Subscribe</button>
            </form>
            <p className="eyebrow mt-4">One quiet letter, once a season.</p>
          </div>
        </div>

        {/* Link grid */}
        <div className="mt-16 md:mt-24 grid grid-cols-12 gap-6 md:gap-10 border-t border-foreground/15 pt-10">
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow">Movement</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-primary">About</Link></li>
              <li><Link href="/mission" className="hover:text-primary">Mission</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary">How it works</Link></li>
              <li><Link href="/blogs" className="hover:text-primary">Journal</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow">Explore</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/forests" className="hover:text-primary">Forests</Link></li>
              <li><Link href="/competitions" className="hover:text-primary">Competitions</Link></li>
              <li><Link href="/leaderboards" className="hover:text-primary">Leaderboards</Link></li>
              <li><Link href="/explore" className="hover:text-primary">Everything</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow">Partners</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/partners" className="hover:text-primary">Overview</Link></li>
              <li><Link href="/login" className="hover:text-primary">CSR / Company</Link></li>
              <li><Link href="/login" className="hover:text-primary">NGO</Link></li>
              <li><Link href="/login" className="hover:text-primary">Nursery</Link></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-3">
            <p className="eyebrow">Elsewhere</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link href="/contact" className="hover:text-primary inline-flex items-center gap-1">Contact <ArrowUpRight className="h-3.5 w-3.5" /></Link></li>
              <li className="flex items-center gap-4 pt-1">
                <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram className="h-4 w-4" /></a>
                <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter className="h-4 w-4" /></a>
                <a href="#" aria-label="YouTube" className="hover:text-primary"><Youtube className="h-4 w-4" /></a>
                <a href="#" aria-label="Github" className="hover:text-primary"><Github className="h-4 w-4" /></a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ARTH · Made in the shade of an old banyan</p>
          <p className="font-serif italic">A living archive of trees and hopeful mornings.</p>
        </div>
      </div>
    </footer>
  )
}

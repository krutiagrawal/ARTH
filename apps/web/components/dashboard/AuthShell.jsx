import Link from 'next/link'
import { Leaf } from 'lucide-react'

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 font-serif text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-primary">
            <Leaf className="h-4 w-4" />
          </span>
          ARTH
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}

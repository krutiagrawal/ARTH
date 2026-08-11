import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container pt-40 pb-32 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-primary">Nothing here yet</p>
      <h1 className="mt-4 font-serif text-6xl md:text-8xl leading-[0.95]">A quiet clearing.</h1>
      <p className="mt-6 max-w-xl mx-auto text-muted-foreground">The page you were looking for hasn’t taken root here. Wander back to the forest.</p>
      <div className="mt-10"><Button asChild className="rounded-full h-11 px-6"><Link href="/">Back home</Link></Button></div>
    </div>
  )
}

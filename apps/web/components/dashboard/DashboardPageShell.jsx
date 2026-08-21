import { cn } from '@/lib/utils'

// Every dashboard page previously capped itself at max-w-6xl/max-w-2xl on its
// own outer div — the shared sidebar shell imposes no width cap itself
// (SidebarInset is genuinely w-full), so that cap was squeezing content into
// roughly two-thirds of the viewport for no reason. 1800px is a deliberate
// ceiling (not uncapped) so content stays fluid on realistic desktop widths
// but doesn't stretch absurdly thin on an ultrawide monitor.
export default function DashboardPageShell({ children, className }) {
  return (
    <div className={cn('w-full max-w-[1800px] mx-auto px-6 py-6 md:px-10 md:py-10 space-y-8', className)}>
      {children}
    </div>
  )
}

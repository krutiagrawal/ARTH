import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Shared empty-state card. Replaces the bare muted-foreground text lines
 * ("No drives yet…", "No pending NGOs.") used across NGO/admin lists.
 */
export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction, className }) {
  return (
    <div className={cn('rounded-3xl border border-dashed border-border/70 p-10 text-center', className)}>
      {Icon && (
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="mt-4 font-serif text-lg">{title}</p>
      {body && <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">{body}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5 rounded-full">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

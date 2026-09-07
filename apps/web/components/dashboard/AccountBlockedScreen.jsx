'use client'

import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Rendered instead of any dashboard shell/content the moment the backend
// reports ACCOUNT_BLOCKED — no navigation back into the app, sign-out only.
export default function AccountBlockedScreen({ reason, onSignOut }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-6 w-6" />
      </span>
      <p className="font-serif text-2xl">ARTH has blocked your account</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Contact support to unblock.
        {reason ? <span className="mt-2 block italic">&ldquo;{reason}&rdquo;</span> : null}
      </p>
      {onSignOut && (
        <Button variant="outline" onClick={onSignOut} className="mt-2 rounded-full">
          Sign out
        </Button>
      )}
    </div>
  )
}

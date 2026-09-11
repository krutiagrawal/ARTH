'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const COPY = {
  pending: {
    title: (entity) => `Your ${entity} is awaiting approval`,
    body: (entity) => `An admin needs to review and approve your ${entity} profile before you can do this. We'll notify you once it's approved.`,
  },
  rejected: {
    title: (entity) => `Your ${entity} application was rejected`,
    body: (entity, reason) => reason || `Update your ${entity} profile details and resubmit for review before you can do this.`,
  },
  suspended: {
    title: (entity) => `Your ${entity} account is suspended`,
    body: () => `Contact support for more information. You can't do this while your account is suspended.`,
  },
}

export default function ApprovalGateDialog({ open, onOpenChange, status, rejectionReason, entityLabel = 'NGO' }) {
  const copy = COPY[status] || COPY.pending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title(entityLabel)}</DialogTitle>
          <DialogDescription>{copy.body(entityLabel, rejectionReason)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="rounded-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

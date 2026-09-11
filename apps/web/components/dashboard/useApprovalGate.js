'use client'

import { useState } from 'react'

/**
 * Gates an action behind org approval status. Instead of disabling buttons,
 * `guard` lets them stay clickable and pops ApprovalGateDialog when the org
 * isn't approved yet, so the user always sees why the action didn't happen.
 */
export function useApprovalGate(status) {
  const [open, setOpen] = useState(false)
  const isApproved = status === 'approved'

  const guard = (fn) => (...args) => {
    if (!isApproved) {
      setOpen(true)
      return
    }
    return fn(...args)
  }

  return { isApproved, open, setOpen, guard }
}
